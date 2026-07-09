from django.urls import path

from . import views

urlpatterns = [
    path("basketball/games/<int:game_id>/analysis/", views.game_analysis, name="basketball-game-analysis"),
]
