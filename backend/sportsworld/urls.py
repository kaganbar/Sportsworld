from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("games.urls")),
    path("api/", include("football_agent.urls")),
    path("api/", include("basketball.urls")),
    path("api/", include("basketball_agent.urls")),
    path("api/", include("tennis.urls")),
    path("api/", include("tennis_agent.urls")),
]
