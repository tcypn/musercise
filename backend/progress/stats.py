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
        rows.append(
            {
                "level": level,
                "sessions": at_level.count(),
                "best_accuracy": best,
                "passed": best is not None and best >= PASS_ACCURACY,
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


def build_progress() -> dict:
    sessions = Session.objects.all()
    totals = sessions.aggregate(
        sessions=Count("id"), questions=Sum("question_count"), correct=Sum("correct_count")
    )
    seconds = sum((s.ended_at - s.started_at).total_seconds() for s in sessions)
    # A practice day is one with an exercise session, or a daily-routine row that was timed or ticked.
    logs = PracticeLog.objects.filter(date__gte=timezone.localdate() - timedelta(days=60))
    days = {s.ended_at.date() for s in sessions} | {
        log.date for log in PracticeLog.objects.filter(Q(seconds__gt=0) | Q(done=True))
    }

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
        "exercises": {name: exercise_stats(name) for name in EXERCISES},
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
                "question_count": s.question_count,
                "accuracy": s.accuracy,
            }
            for s in sessions[:60]
        ],
    }
