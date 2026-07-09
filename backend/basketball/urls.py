from django.urls import path

from . import views

urlpatterns = [
    path("basketball/games/today/", views.games_today, name="basketball-games-today"),
    path("basketball/games/<int:game_id>/", views.game_detail, name="basketball-game-detail"),
]
