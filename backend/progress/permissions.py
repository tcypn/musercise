import hmac

from django.conf import settings
from rest_framework.permissions import BasePermission


class HasApiToken(BasePermission):
    """Single-user auth: `Authorization: Bearer <API_TOKEN>`."""

    def has_permission(self, request, view):
        expected = settings.API_TOKEN
        if not expected:
            return settings.DEBUG  # no token configured: open only in local dev
        header = request.headers.get("Authorization", "")
        scheme, _, supplied = header.partition(" ")
        return scheme.lower() == "bearer" and hmac.compare_digest(supplied.strip(), expected)
