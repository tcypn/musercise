from django.db import migrations, models
from django.db.models import CharField
from django.db.models.functions import Cast


def to_items(apps, schema_editor):
    """v1 stored interval sizes as integers; they become the string item ids."""
    Attempt = apps.get_model("progress", "Attempt")
    Attempt.objects.update(
        item=Cast("interval_semitones", CharField()),
        answered=Cast("answered_semitones", CharField()),
    )


def to_semitones(apps, schema_editor):
    Attempt = apps.get_model("progress", "Attempt")
    for attempt in Attempt.objects.all().iterator():
        attempt.interval_semitones = int(attempt.item) if attempt.item.isdigit() else 0
        attempt.answered_semitones = int(attempt.answered) if attempt.answered.isdigit() else 0
        attempt.save(update_fields=["interval_semitones", "answered_semitones"])


class Migration(migrations.Migration):
    dependencies = [("progress", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="attempt",
            name="item",
            field=models.CharField(default="", max_length=16),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="attempt",
            name="answered",
            field=models.CharField(default="", max_length=16),
            preserve_default=False,
        ),
        # Defaults let the old columns be re-created if this migration is reversed.
        migrations.AlterField(
            model_name="attempt",
            name="interval_semitones",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="attempt",
            name="answered_semitones",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.RunPython(to_items, to_semitones),
        migrations.RemoveField(model_name="attempt", name="interval_semitones"),
        migrations.RemoveField(model_name="attempt", name="answered_semitones"),
    ]
