from .models import NameTranslation


def resolve_lang(request) -> str:
    """Permissive lang resolution for read endpoints (list/detail views) —
    anything other than "he" falls back to "en" rather than erroring, since
    translation is graceful degradation, not a strict API contract. The
    *_agent analysis endpoints keep their own stricter 400-on-invalid-lang
    validation unchanged."""
    return "he" if request.query_params.get("lang") == "he" else "en"


def translate(text: str, lang: str) -> str:
    """Returns the Hebrew translation of `text` if lang == "he" and a
    dictionary entry exists, otherwise returns `text` unchanged. The
    fallback-to-original behavior is deliberate: a name a future live API
    introduces that hasn't been translated yet should still render, just
    untranslated, rather than break."""
    if lang != "he" or not text:
        return text
    match = NameTranslation.objects.filter(source_text=text).values_list("translated_text", flat=True).first()
    return match or text


def translate_many(texts: list[str], lang: str) -> dict[str, str]:
    """Batch form of translate() — one query instead of N, for building AI
    agent match context where several names need translating at once."""
    if lang != "he":
        return {t: t for t in texts}
    found = dict(
        NameTranslation.objects.filter(source_text__in=texts).values_list("source_text", "translated_text")
    )
    return {t: found.get(t, t) for t in texts}
