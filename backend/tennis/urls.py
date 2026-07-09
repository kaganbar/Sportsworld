from django.urls import path

from . import views

urlpatterns = [
    path("tennis/matches/today/", views.matches_today, name="tennis-matches-today"),
    path("tennis/matches/<int:match_id>/", views.match_detail, name="tennis-match-detail"),
]
