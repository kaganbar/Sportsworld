from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("games/today/", views.games_today, name="games-today"),
    path("games/<int:game_id>/", views.game_detail, name="game-detail"),
]
