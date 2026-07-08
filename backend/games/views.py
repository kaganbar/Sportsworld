from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health(request):
    """Proves the frontend <-> backend <-> db wiring is correct (Phase 0)."""
    return Response({"status": "ok", "service": "sportsworld-backend"})
