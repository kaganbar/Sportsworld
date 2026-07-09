from django.contrib import admin

from .models import NameTranslation


@admin.register(NameTranslation)
class NameTranslationAdmin(admin.ModelAdmin):
    list_display = ["source_text", "translated_text", "category"]
    list_filter = ["category"]
    search_fields = ["source_text", "translated_text"]
