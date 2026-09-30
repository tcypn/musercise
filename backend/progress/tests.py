import uuid
from datetime import timedelta

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Session

TOKEN = "test-token"


def make_payload(exercise="intervals", level=1, total=20, wrong=0, client_id=None, item="7", mode="ascending", wrong_answer="5"):
    now = timezone.now()
    attempts = [
        {
            "root_midi": 60,
            "item": item,
            "mode": mode,
            "answered": item if i >= wrong else wrong_answer,
            "correct": True,  # deliberately lies for wrong ones: the server must recompute
            "response_ms": 1500,
        }
        for i in range(total)
    ]
    return {
        "client_id": str(client_id or uuid.uuid4()),
        "exercise": exercise,
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

    def progress(self):
        return self.client.get("/api/progress/").data

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
        self.assertEqual(self.post({**make_payload(), "exercise": "scales"}).status_code, 400)
        bad = make_payload()
        bad["attempts"][0]["root_midi"] = 5
        self.assertEqual(self.post(bad).status_code, 400)

    def test_items_and_modes_are_checked_per_exercise(self):
        # A chord id is not an interval, and 'harmonic' is not a chord mode.
        self.assertEqual(self.post(make_payload(exercise="intervals", item="maj")).status_code, 400)
        self.assertEqual(self.post(make_payload(exercise="chords", item="7", wrong_answer="maj")).status_code, 400)
        self.assertEqual(self.post(make_payload(exercise="chords", item="maj", mode="harmonic", wrong_answer="min")).status_code, 400)
        self.assertEqual(self.post(make_payload(exercise="chords", item="maj", mode="block", wrong_answer="min")).status_code, 201)

    def test_legacy_v1_payload_is_still_accepted(self):
        legacy = make_payload(total=20, wrong=2)
        legacy["attempts"] = [
            {"root_midi": 60, "interval_semitones": 7, "mode": "ascending",
             "answered_semitones": 7 if i >= 2 else 5, "correct": i >= 2, "response_ms": 900}
            for i in range(20)
        ]
        res = self.post(legacy)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["correct_count"], 18)

    def test_level_pass_requires_80_percent_over_20_questions(self):
        self.post(make_payload(level=1, total=20, wrong=5))  # 75%
        self.assertFalse(self.progress()["exercises"]["intervals"]["levels"][0]["passed"])
        self.post(make_payload(level=1, total=10, wrong=0))  # perfect but too short
        self.assertFalse(self.progress()["exercises"]["intervals"]["levels"][0]["passed"])
        self.post(make_payload(level=1, total=20, wrong=4))  # 80%
        levels = self.progress()["exercises"]["intervals"]["levels"]
        self.assertTrue(levels[0]["passed"])
        self.assertEqual(levels[0]["sessions"], 3)
        self.assertAlmostEqual(levels[0]["best_accuracy"], 0.8)

    def test_levels_are_tracked_per_exercise(self):
        self.post(make_payload(exercise="chords", level=1, item="maj", mode="block", wrong_answer="min"))
        data = self.progress()["exercises"]
        self.assertTrue(data["chords"]["levels"][0]["passed"])
        self.assertEqual(data["intervals"]["levels"], [])

    def test_progress_aggregates(self):
        self.post(make_payload(total=20, wrong=2))
        self.post(make_payload(exercise="chords", item="min", mode="block", wrong_answer="maj", total=10, wrong=0))
        data = self.progress()
        self.assertEqual(data["totals"]["questions"], 30)
        self.assertEqual(data["totals"]["correct"], 28)
        self.assertEqual(data["totals"]["streak_days"], 1)  # both exercises land on the same day
        self.assertEqual(data["totals"]["practice_seconds"], 600)
        self.assertEqual(data["exercises"]["intervals"]["items"], [{"item": "7", "asked": 20, "correct": 18}])
        self.assertEqual(data["exercises"]["intervals"]["confusions"], [{"asked": "7", "answered": "5", "count": 2}])
        self.assertEqual(data["exercises"]["chords"]["items"], [{"item": "min", "asked": 10, "correct": 10}])
        self.assertEqual({h["exercise"] for h in data["history"]}, {"intervals", "chords"})


class MigrationTests(TransactionTestCase):
    """The v1 -> v2 migration must keep the practice history that already exists."""

    def migrate(self, target):
        executor = MigrationExecutor(connection)
        executor.migrate([("progress", target)])
        return executor.loader.project_state([("progress", target)]).apps

    def tearDown(self):
        self.migrate("0002_generalise_attempts")  # leave the database at the latest schema

    def test_interval_attempts_survive(self):
        old = self.migrate("0001_initial")
        now = timezone.now()
        session = old.get_model("progress", "Session").objects.create(
            exercise="intervals", level=3, started_at=now, ended_at=now, question_count=2, correct_count=1
        )
        Attempt = old.get_model("progress", "Attempt")
        Attempt.objects.create(session=session, root_midi=60, interval_semitones=7, mode="ascending",
                               answered_semitones=7, correct=True, response_ms=800)
        Attempt.objects.create(session=session, root_midi=48, interval_semitones=4, mode="harmonic",
                               answered_semitones=3, correct=False, response_ms=1200)

        new = self.migrate("0002_generalise_attempts")
        rows = list(new.get_model("progress", "Attempt").objects.order_by("id").values_list("item", "answered", "correct", "mode"))
        self.assertEqual(rows, [("7", "7", True, "ascending"), ("4", "3", False, "harmonic")])

        back = self.migrate("0001_initial")  # and it can be reversed
        restored = list(back.get_model("progress", "Attempt").objects.order_by("id").values_list("interval_semitones", "answered_semitones"))
        self.assertEqual(restored, [(7, 7), (4, 3)])
