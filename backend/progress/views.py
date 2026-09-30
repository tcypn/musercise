import uuid
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import PracticeLog, Session
from .serializers import PracticeEntrySerializer, SessionSerializer
from .stats import build_progress


@api_view(["POST"])
def create_session(request):
    """Store a finished practice session. Re-sending the same client_id is a no-op."""
    try:
        client_id = uuid.UUID(str(request.data.get("client_id")))
    except ValueError:
        client_id = None  # let the serializer produce the 400 for a bad/missing id
    if client_id and Session.objects.filter(client_id=client_id).exists():
        return Response({"client_id": str(client_id), "duplicate": True}, status=status.HTTP_200_OK)
    serializer = SessionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    session = serializer.save()
    return Response(
        {"client_id": str(session.client_id), "question_count": session.question_count,
         "correct_count": session.correct_count},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def progress(request):
    return Response(build_progress())


MAX_ENTRIES_PER_REQUEST = 200


def log_row(log):
    return {"date": log.date.isoformat(), "item": log.item, "seconds": log.seconds, "done": log.done}


@api_view(["GET", "POST"])
def practice(request):
    """Daily practice log. POST upserts entries and merges with what is stored (most seconds, done if ever done),
    so a retried request, or the same day logged from two devices, never loses anything."""
    if request.method == "GET":
        since = parse_date(request.query_params.get("since", ""))
        if since is None:
            since = timezone.localdate() - timedelta(days=60)
        return Response({"logs": [log_row(log) for log in PracticeLog.objects.filter(date__gte=since)]})

    entries = request.data.get("entries") if hasattr(request.data, "get") else None
    if not isinstance(entries, list) or not 0 < len(entries) <= MAX_ENTRIES_PER_REQUEST:
        return Response({"entries": "Send between 1 and %d entries." % MAX_ENTRIES_PER_REQUEST}, status=status.HTTP_400_BAD_REQUEST)
    serializer = PracticeEntrySerializer(data=entries, many=True)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        for entry in serializer.validated_data:
            log, created = PracticeLog.objects.get_or_create(
                date=entry["date"], item=entry["item"], defaults={"seconds": entry["seconds"], "done": entry["done"]}
            )
            if not created:
                log.seconds = max(log.seconds, entry["seconds"])
                log.done = log.done or entry["done"]
                log.save()
    return Response({"saved": len(entries)}, status=status.HTTP_200_OK)
