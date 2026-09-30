import uuid

from django.db import models


class Session(models.Model):
    """One practice run of one level. `client_id` makes retried uploads idempotent."""

    client_id = models.UUIDField(default=uuid.uuid4, unique=True)
    exercise = models.CharField(max_length=32)
    level = models.PositiveSmallIntegerField()
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField()
    question_count = models.PositiveSmallIntegerField()
    correct_count = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["-ended_at"]

    @property
    def accuracy(self) -> float:
        return self.correct_count / self.question_count if self.question_count else 0.0


class Attempt(models.Model):
    """One answered question. `item` and `answered` are exercise item ids (see rules.EXERCISES)."""

    session = models.ForeignKey(Session, related_name="attempts", on_delete=models.CASCADE)
    root_midi = models.PositiveSmallIntegerField()
    item = models.CharField(max_length=16)
    mode = models.CharField(max_length=16)
    answered = models.CharField(max_length=16)
    correct = models.BooleanField()
    response_ms = models.PositiveIntegerField()
