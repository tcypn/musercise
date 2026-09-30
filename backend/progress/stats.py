from collections import Counter
from datetime import timedelta

from django.db.models import Count, Max, Q, Sum
from django.utils import timezone

from .models import Attempt, PracticeLog, Session
from .rules import EXERCISES, MIN_QUESTIONS, PASS_ACCURACY


def level_stats(exercise: str) -> list[dict]:
    """Per-level sessions, best accuracy over qualifying sessions, and pass state."""
    rows = []
    sessions = Session.objects.filter(exercise=exercise)
    for level in sorted(set(sessions.values_list("level", flat=True))):
        at_level = sessions.filter(level=level)
        qualifying = [s for s in at_level if s.question_count >= MIN_QUESTIONS]
        best = max((s.accuracy for s in qualifying), default=None)
        passing_days = [s.day for s in qualifying if s.accuracy >= PASS_ACCURACY]
        rows.append(
            {
                "level": level,
                "sessions": at_level.count(),
                "best_accuracy": best,
                "passed": best is not None and best >= PASS_ACCURACY,
                # The day the level was first passed (for "levels passed this week").
                "first_passed": min(passing_days).isoformat() if passing_days else None,
            }
        )
    return rows


def exercise_stats(exercise: str) -> dict:
    attempts = Attempt.objects.filter(session__exercise=exercise)
    per_item = (
        attempts.values("item")
        .annotate(asked=Count("id"), correct=Count("id", filter=Q(correct=True)))
        .order_by("item")
    )
    confusions = Counter(attempts.filter(correct=False).values_list("item", "answered"))
    return {
        "levels": level_stats(exercise),
        "items": [{"item": r["item"], "asked": r["asked"], "correct": r["correct"]} for r in per_item],
        "confusions": [
            {"asked": a, "answered": b, "count": n} for (a, b), n in confusions.most_common(10)
        ],
    }


def streak_days(days: set) -> int:
    """Consecutive practice days ending today (or yesterday, so an unpracticed morning keeps it)."""
    today = timezone.now().date()
    cursor = today if today in days else today - timedelta(days=1)
    streak = 0
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


HISTORY_DAYS = 120


def daily_totals(sessions: list) -> list[dict]:
    """Per calendar day: sessions, questions, correct answers and seconds spent, for the last 120 days."""
    cutoff = timezone.localdate() - timedelta(days=HISTORY_DAYS)
    rows: dict = {}
    for s in sessions:
        if s.day < cutoff:
            continue
        row = rows.setdefault(s.day, {"date": s.day.isoformat(), "sessions": 0, "questions": 0, "correct": 0, "seconds": 0})
        row["sessions"] += 1
        row["questions"] += s.question_count
        row["correct"] += s.correct_count
        row["seconds"] += int((s.ended_at - s.started_at).total_seconds())
    return [rows[d] for d in sorted(rows)]


def lesson_ids() -> list[str]:
    """The two original lessons first, then every other lesson that has a session, alphabetically."""
    seen = set(Session.objects.values_list("exercise", flat=True).distinct())
    return [*EXERCISES, *sorted(seen - set(EXERCISES))]


def build_progress() -> dict:
    sessions = Session.objects.all()
    all_sessions = list(sessions)
    totals = sessions.aggregate(
        sessions=Count("id"), questions=Sum("question_count"), correct=Sum("correct_count")
    )
    seconds = sum((s.ended_at - s.started_at).total_seconds() for s in all_sessions)
    # A practice day is one with an exercise session, or a daily-routine row that was timed or ticked.
    logs = PracticeLog.objects.filter(date__gte=timezone.localdate() - timedelta(days=60))
    days = {s.day for s in all_sessions} | {
        log.date for log in PracticeLog.objects.filter(Q(seconds__gt=0) | Q(done=True))
    }
    cutoff = timezone.localdate() - timedelta(days=HISTORY_DAYS)

    return {
        "totals": {
            "sessions": totals["sessions"] or 0,
            "questions": totals["questions"] or 0,
            "correct": totals["correct"] or 0,
            "practice_seconds": int(seconds),
            "streak_days": streak_days(days),
            "last_practiced": sessions.aggregate(m=Max("ended_at"))["m"],
            # Latest day with anything practised (a session or a routine row): the streak ends here.
            "last_practice_day": max(days).isoformat() if days else None,
        },
        "exercises": {name: exercise_stats(name) for name in lesson_ids()},
        # Every day with practice (last 120 days): the app works out the streak from this.
        "days": [d.isoformat() for d in sorted(days) if d >= cutoff],
        "daily": daily_totals(all_sessions),
        "practice": {
            "logs": [
                {"date": log.date.isoformat(), "item": log.item, "seconds": log.seconds, "done": log.done}
                for log in logs
            ]
        },
        "history": [
            {
                "id": s.id,
                "exercise": s.exercise,
                "level": s.level,
                "ended_at": s.ended_at,
                "day": s.day.isoformat(),
                "question_count": s.question_count,
                "accuracy": s.accuracy,
            }
            for s in all_sessions[:60]
        ],
    }
