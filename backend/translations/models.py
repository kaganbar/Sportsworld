from django.db import models


class NameTranslation(models.Model):
    """English -> Hebrew dictionary for team/player/competition/venue names.

    Sport-agnostic and consulted by every serializer that emits a display
    name, so a future live sports API's English-only data can be shown in
    Hebrew without touching the data model. Deliberately just a flat lookup,
    not tied to any sport app — `translate()` falls back to the English
    original when no entry exists, so unrecognized names never break."""

    source_text = models.CharField(max_length=200, unique=True)
    translated_text = models.CharField(max_length=200)
    category = models.CharField(max_length=30, blank=True)  # "team"/"player"/"competition"/"venue" — admin filtering only

    class Meta:
        ordering = ["category", "source_text"]

    def __str__(self):
        return f"{self.source_text} -> {self.translated_text}"
