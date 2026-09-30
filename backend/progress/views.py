import uuid

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Session
from .serializers import SessionSerializer
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
