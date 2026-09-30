import uuid
from datetime import timedelta

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Session

TOKEN = "test-token"


def make_payload(level=1, total=20, wrong=0, client_id=None, semitones=7):
    now = timezone.now()
    attempts = [
        {
            "root_midi": 60,
            "interval_semitones": semitones,
            "mode": "ascending",
            "answered_semitones": semitones if i >= wrong else 5,
            "correct": True,  # deliberately lies for wrong ones: server must recompute
            "response_ms": 1500,
        }
        for i in range(total)
    ]
    return {
        "client_id": str(client_id or uuid.uuid4()),
        "exercise": "intervals",
        "level": level,
        "started_at": (now - timedelta(minutes=5)).isoformat(),
        "ended_at": now.isoformat(),
        "attempts": attempts,
    }


@override_settings(API_TOKEN=TOKEN)
class ApiTests(APITestCase):
    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {TOKEN}")

    def post(self, payload):
        return self.client.post("/api/sessions/", payload, format="json")

    def test_requires_token(self):
        self.client.credentials()
        self.assertEqual(self.client.get("/api/progress/").status_code, 403)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer nope")
        self.assertEqual(self.client.get("/api/progress/").status_code, 403)

    @override_settings(API_TOKEN="", DEBUG=False)
    def test_closed_when_no_token_configured_in_production(self):
        self.client.credentials()
        self.assertEqual(self.client.get("/api/progress/").status_code, 403)

    def test_session_correctness_recomputed_server_side(self):
        res = self.post(make_payload(total=20, wrong=4))
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["correct_count"], 16)

    def test_duplicate_client_id_is_idempotent(self):
        payload = make_payload()
        self.assertEqual(self.post(payload).status_code, 201)
        self.assertEqual(self.post(payload).status_code, 200)
        self.assertEqual(Session.objects.count(), 1)

    def test_validation_errors(self):
        self.assertEqual(self.post({**make_payload(), "attempts": []}).status_code, 400)
        self.assertEqual(self.post({**make_payload(), "client_id": "junk"}).status_code, 400)
        bad = make_payload()
        bad["attempts"][0]["root_midi"] = 5
        self.assertEqual(self.post(bad).status_code, 400)

    def test_level_pass_requires_80_percent_over_20_questions(self):
        self.post(make_payload(level=1, total=20, wrong=5))  # 75%
        levels = self.client.get("/api/progress/").data["levels"]
        self.assertFalse(levels[0]["passed"])
        self.post(make_payload(level=1, total=10, wrong=0))  # perfect but too short
        self.assertFalse(self.client.get("/api/progress/").data["levels"][0]["passed"])
        self.post(make_payload(level=1, total=20, wrong=4))  # 80%
        levels = self.client.get("/api/progress/").data["levels"]
        self.assertTrue(levels[0]["passed"])
        self.assertEqual(levels[0]["sessions"], 3)
        self.assertAlmostEqual(levels[0]["best_accuracy"], 0.8)

    def test_progress_aggregates(self):
        self.post(make_payload(total=20, wrong=2))
        data = self.client.get("/api/progress/").data
        self.assertEqual(data["totals"]["questions"], 20)
        self.assertEqual(data["totals"]["correct"], 18)
        self.assertEqual(data["totals"]["streak_days"], 1)
        self.assertEqual(data["totals"]["practice_seconds"], 300)
        self.assertEqual(data["intervals"], [{"semitones": 7, "asked": 20, "correct": 18}])
        self.assertEqual(data["confusions"], [{"asked": 7, "answered": 5, "count": 2}])
        self.assertEqual(len(data["history"]), 1)
