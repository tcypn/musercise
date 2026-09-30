import uuid
from datetime import date, timedelta

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.conf import settings
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import PracticeLog, Session

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


class DatabaseSettingsTests(TestCase):
    def test_sqlite_takes_the_write_lock_up_front_so_overlapping_uploads_wait_instead_of_failing(self):
        options = settings.DATABASES["default"]["OPTIONS"]
        self.assertEqual(options["transaction_mode"], "IMMEDIATE")
        self.assertGreaterEqual(options["timeout"], 10)


class MigrationTestBase(TransactionTestCase):
    def migrate(self, target):
        executor = MigrationExecutor(connection)
        executor.migrate([("progress", target)])
        return executor.loader.project_state([("progress", target)]).apps

    def tearDown(self):
        # Leave the database at the latest schema so later tests find every table.
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())


class MigrationTests(MigrationTestBase):
    """The v1 -> v2 migration must keep the practice history that already exists."""

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


def practice_entry(item="scale", seconds=300, done=True, day=None):
    return {"date": (day or timezone.localdate()).isoformat(), "item": item, "seconds": seconds, "done": done}


@override_settings(API_TOKEN=TOKEN)
class PracticeTests(APITestCase):
    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {TOKEN}")

    def post(self, *entries):
        return self.client.post("/api/practice/", {"entries": list(entries)}, format="json")

    def logs(self, **params):
        return self.client.get("/api/practice/", params).data["logs"]

    def test_requires_token(self):
        self.client.credentials()
        self.assertEqual(self.client.get("/api/practice/").status_code, 403)
        self.assertEqual(self.post(practice_entry()).status_code, 403)

    def test_saves_and_lists_entries(self):
        res = self.post(practice_entry("warmup", 120, False), practice_entry("scale", 300, True))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["saved"], 2)
        rows = {row["item"]: row for row in self.logs()}
        self.assertEqual(rows["warmup"], {"date": timezone.localdate().isoformat(), "item": "warmup", "seconds": 120, "done": False})
        self.assertEqual(rows["scale"]["done"], True)

    def test_upsert_merges_so_retries_and_two_devices_lose_nothing(self):
        self.post(practice_entry("scale", 300, False))
        self.post(practice_entry("scale", 120, True))  # less time, but now ticked
        self.post(practice_entry("scale", 300, False))  # a stale retry must not untick it
        self.assertEqual(PracticeLog.objects.count(), 1)
        row = self.logs()[0]
        self.assertEqual((row["seconds"], row["done"]), (300, True))

    def test_validation(self):
        bad_item = practice_entry("dance")
        too_long = practice_entry("scale", 90_000)
        negative = practice_entry("scale", -1)
        future = practice_entry(day=timezone.localdate() + timedelta(days=30))
        not_a_date = {**practice_entry(), "date": "yesterday"}
        for bad in (bad_item, too_long, negative, future, not_a_date):
            self.assertEqual(self.post(bad).status_code, 400, bad)
        self.assertEqual(self.client.post("/api/practice/", {"entries": []}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/practice/", {"entries": "nope"}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/practice/", [practice_entry()], format="json").status_code, 400)
        self.assertEqual(PracticeLog.objects.count(), 0)  # nothing is half-saved

    def test_one_bad_entry_saves_nothing(self):
        self.assertEqual(self.post(practice_entry("scale"), practice_entry("dance")).status_code, 400)
        self.assertEqual(PracticeLog.objects.count(), 0)

    def test_since_filters_and_defaults_to_60_days(self):
        old = timezone.localdate() - timedelta(days=90)
        self.post(practice_entry("scale", day=old), practice_entry("ear"))
        self.assertEqual([row["item"] for row in self.logs()], ["ear"])
        self.assertEqual(len(self.logs(since=old.isoformat())), 2)

    def test_practice_only_day_counts_for_the_streak(self):
        today = timezone.localdate()
        # A session today, plus routine rows on the two days before: three days in a row.
        self.client.post("/api/sessions/", make_payload(), format="json")
        self.post(practice_entry("scale", 60, False, today - timedelta(days=1)), practice_entry("warmup", 0, True, today - timedelta(days=2)))
        self.assertEqual(self.client.get("/api/progress/").data["totals"]["streak_days"], 3)

    def test_last_practice_day_covers_sessions_and_routine_rows(self):
        today = timezone.localdate()
        self.assertIsNone(self.client.get("/api/progress/").data["totals"]["last_practice_day"])
        self.post(practice_entry("scale", 60, True, today - timedelta(days=1)))
        self.assertEqual(self.client.get("/api/progress/").data["totals"]["last_practice_day"], (today - timedelta(days=1)).isoformat())
        self.client.post("/api/sessions/", make_payload(), format="json")
        self.assertEqual(self.client.get("/api/progress/").data["totals"]["last_practice_day"], today.isoformat())

    def test_an_untouched_row_does_not_count(self):
        self.post(practice_entry("scale", 0, False, timezone.localdate() - timedelta(days=1)))
        self.assertEqual(self.client.get("/api/progress/").data["totals"]["streak_days"], 0)

    def test_progress_includes_recent_logs(self):
        self.post(practice_entry("cadence", 200, True))
        logs = self.client.get("/api/progress/").data["practice"]["logs"]
        self.assertEqual([(row["item"], row["seconds"]) for row in logs], [("cadence", 200)])


class PracticeMigrationTests(MigrationTestBase):
    """0003 only adds a table: existing sessions must be untouched, and it must reverse cleanly."""

    def test_adding_the_practice_table_keeps_sessions(self):
        old = self.migrate("0002_generalise_attempts")
        now = timezone.now()
        old.get_model("progress", "Session").objects.create(
            exercise="chords", level=2, started_at=now, ended_at=now, question_count=20, correct_count=18
        )
        new = self.migrate("0003_practicelog")
        self.assertEqual(new.get_model("progress", "Session").objects.count(), 1)
        new.get_model("progress", "PracticeLog").objects.create(date=date(2026, 9, 30), item="scale", seconds=60, done=True)
        back = self.migrate("0002_generalise_attempts")
        self.assertEqual(back.get_model("progress", "Session").objects.count(), 1)
