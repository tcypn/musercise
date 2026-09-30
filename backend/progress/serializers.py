from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Attempt, Session
from .rules import EXERCISES, LESSON_ID_RE, MAX_PRACTICE_SECONDS, PRACTICE_ITEMS, TOKEN_RE


class AttemptSerializer(serializers.ModelSerializer):
    root_midi = serializers.IntegerField(min_value=21, max_value=108)
    item = serializers.CharField(max_length=16)
    answered = serializers.CharField(max_length=16)
    mode = serializers.CharField(max_length=16)
    response_ms = serializers.IntegerField(min_value=0, max_value=3_600_000)

    class Meta:
        model = Attempt
        # `correct` is never read from the client: the server works it out.
        fields = ["root_midi", "item", "mode", "answered", "response_ms"]


def upgrade_legacy_attempt(attempt):
    """v1 clients sent `interval_semitones` / `answered_semitones` as integers."""
    if isinstance(attempt, dict) and "interval_semitones" in attempt and "item" not in attempt:
        attempt = dict(attempt)
        attempt["item"] = str(attempt.pop("interval_semitones"))
        attempt["answered"] = str(attempt.pop("answered_semitones", ""))
    return attempt


class SessionSerializer(serializers.ModelSerializer):
    attempts = AttemptSerializer(many=True, allow_empty=False)
    exercise = serializers.RegexField(LESSON_ID_RE, max_length=32)
    level = serializers.IntegerField(min_value=1, max_value=99)

    class Meta:
        model = Session
        fields = ["client_id", "exercise", "level", "started_at", "ended_at", "local_date", "attempts"]
        extra_kwargs = {"local_date": {"required": False, "allow_null": True}}

    def to_internal_value(self, data):
        if hasattr(data, "get") and isinstance(data.get("attempts"), list):
            data = {**data, "attempts": [upgrade_legacy_attempt(a) for a in data["attempts"]]}
        return super().to_internal_value(data)

    def validate_local_date(self, value):
        if value is not None and value > timezone.localdate() + timedelta(days=2):
            raise serializers.ValidationError("The date is too far in the future.")
        return value

    def validate(self, data):
        if data["ended_at"] < data["started_at"]:
            raise serializers.ValidationError("ended_at must not be before started_at.")
        rules = EXERCISES.get(data["exercise"])
        for attempt in data["attempts"]:
            if rules is not None:
                if attempt["item"] not in rules["items"] or attempt["answered"] not in rules["items"]:
                    raise serializers.ValidationError(f"Unknown answer for exercise '{data['exercise']}'.")
                if attempt["mode"] not in rules["modes"]:
                    raise serializers.ValidationError(f"Unknown mode for exercise '{data['exercise']}'.")
            elif not all(TOKEN_RE.match(attempt[key]) for key in ("item", "answered", "mode")):
                raise serializers.ValidationError(f"Malformed answer for exercise '{data['exercise']}'.")
        return data

    @transaction.atomic
    def create(self, validated_data):
        attempts = validated_data.pop("attempts")
        for a in attempts:
            a["correct"] = a["answered"] == a["item"]
        session = Session.objects.create(
            question_count=len(attempts),
            correct_count=sum(a["correct"] for a in attempts),
            **validated_data,
        )
        Attempt.objects.bulk_create([Attempt(session=session, **a) for a in attempts])
        return session


class PracticeEntrySerializer(serializers.Serializer):
    date = serializers.DateField()
    item = serializers.ChoiceField(choices=PRACTICE_ITEMS)
    seconds = serializers.IntegerField(min_value=0, max_value=MAX_PRACTICE_SECONDS)
    done = serializers.BooleanField()

    def validate_date(self, value):
        # The app sends the user's local date, which can be a day ahead of the server's.
        if value > timezone.localdate() + timedelta(days=2):
            raise serializers.ValidationError("The date is too far in the future.")
        return value
