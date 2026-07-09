from django.urls import path

from . import views

urlpatterns = [
    path("tennis/matches/<int:match_id>/analysis/", views.match_analysis, name="tennis-match-analysis"),
]
