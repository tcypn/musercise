from django.db import transaction
from rest_framework import serializers

from .models import Attempt, Session
from .rules import EXERCISE_INTERVALS

MODES = ("ascending", "descending", "harmonic")


class AttemptSerializer(serializers.ModelSerializer):
    root_midi = serializers.IntegerField(min_value=21, max_value=108)
    interval_semitones = serializers.IntegerField(min_value=1, max_value=12)
    answered_semitones = serializers.IntegerField(min_value=1, max_value=12)
    mode = serializers.ChoiceField(choices=MODES)

    class Meta:
        model = Attempt
        fields = ["root_midi", "interval_semitones", "mode", "answered_semitones", "correct", "response_ms"]


class SessionSerializer(serializers.ModelSerializer):
    attempts = AttemptSerializer(many=True, allow_empty=False)
    exercise = serializers.ChoiceField(choices=[EXERCISE_INTERVALS])
    level = serializers.IntegerField(min_value=1, max_value=99)

    class Meta:
        model = Session
        fields = ["client_id", "exercise", "level", "started_at", "ended_at", "attempts"]

    def validate(self, data):
        if data["ended_at"] < data["started_at"]:
            raise serializers.ValidationError("ended_at must not be before started_at.")
        return data

    @transaction.atomic
    def create(self, validated_data):
        attempts = validated_data.pop("attempts")
        for a in attempts:  # trust the interval math, not a client-sent flag
            a["correct"] = a["answered_semitones"] == a["interval_semitones"]
        session = Session.objects.create(
            question_count=len(attempts),
            correct_count=sum(a["correct"] for a in attempts),
            **validated_data,
        )
        Attempt.objects.bulk_create([Attempt(session=session, **a) for a in attempts])
        return session
