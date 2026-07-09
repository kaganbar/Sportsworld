from django.urls import path

from . import views

urlpatterns = [
    path("games/<int:game_id>/analysis/", views.game_analysis, name="game-analysis"),
]
