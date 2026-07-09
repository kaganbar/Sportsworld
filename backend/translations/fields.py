from rest_framework import serializers

from .service import translate


class TranslatedCharField(serializers.CharField):
    """Drop-in replacement for serializers.CharField that translates its
    output via the NameTranslation dictionary. Requires the serializer to be
    instantiated with context={"lang": <"en"|"he">} — DRF propagates context
    to nested serializers/fields automatically, so this only needs to be
    passed once at the top-level serializer in each view."""

    def to_representation(self, value):
        value = super().to_representation(value)
        lang = self.context.get("lang", "en")
        return translate(value, lang)
