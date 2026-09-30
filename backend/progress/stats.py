from collections import Counter
from datetime import timedelta

from django.db.models import Count, Max, Q, Sum
from django.utils import timezone

from .models import Attempt, Session
from .rules import EXERCISE_INTERVALS, MIN_QUESTIONS, PASS_ACCURACY


def level_stats(exercise: str) -> list[dict]:
    """Per-level sessions, best accuracy over qualifying sessions, and pass state."""
    rows = []
    sessions = Session.objects.filter(exercise=exercise)
    for level in sorted(set(sessions.values_list("level", flat=True))):
        qualifying = [s for s in sessions.filter(level=level) if s.question_count >= MIN_QUESTIONS]
        best = max((s.accuracy for s in qualifying), default=None)
        rows.append(
            {
                "level": level,
                "sessions": sessions.filter(level=level).count(),
                "best_accuracy": best,
                "passed": best is not None and best >= PASS_ACCURACY,
            }
        )
    return rows


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
    days = {s.ended_at.date() for s in sessions}

    per_interval = (
        Attempt.objects.values("interval_semitones")
        .annotate(asked=Count("id"), correct=Count("id", filter=Q(correct=True)))
        .order_by("interval_semitones")
    )
    confusions = Counter(
        Attempt.objects.filter(correct=False).values_list("interval_semitones", "answered_semitones")
    )

    return {
        "totals": {
            "sessions": totals["sessions"] or 0,
            "questions": totals["questions"] or 0,
            "correct": totals["correct"] or 0,
            "practice_seconds": int(seconds),
            "streak_days": streak_days(days),
            "last_practiced": sessions.aggregate(m=Max("ended_at"))["m"],
        },
        "levels": level_stats(EXERCISE_INTERVALS),
        "intervals": [
            {"semitones": r["interval_semitones"], "asked": r["asked"], "correct": r["correct"]}
            for r in per_interval
        ],
        "confusions": [
            {"asked": a, "answered": b, "count": n} for (a, b), n in confusions.most_common(10)
        ],
        "history": [
            {
                "id": s.id,
                "level": s.level,
                "ended_at": s.ended_at,
                "question_count": s.question_count,
                "accuracy": s.accuracy,
            }
            for s in sessions[:60]
        ],
    }
