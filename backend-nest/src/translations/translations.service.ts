import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Lang } from '../common/lang.decorator';

@Injectable()
export class TranslationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the Hebrew translation of `text` if lang === "he" and a
   * dictionary entry exists, otherwise `text` unchanged. Unrecognized names
   * (e.g. from a future scraped source) fall back to the original rather
   * than breaking the response. Mirrors translations/service.py::translate. */
  async translate(text: string, lang: Lang): Promise<string> {
    if (lang !== 'he' || !text) return text;
    const row = await this.prisma.nameTranslation.findUnique({ where: { sourceText: text } });
    return row?.translatedText ?? text;
  }

  /** Batch form — one query instead of N, for translating every name in a
   * list/detail response at once. */
  async translateMany(texts: string[], lang: Lang): Promise<Record<string, string>> {
    if (lang !== 'he') return Object.fromEntries(texts.map((t) => [t, t]));
    const rows = await this.prisma.nameTranslation.findMany({
      where: { sourceText: { in: texts } },
    });
    const found = new Map(rows.map((r) => [r.sourceText, r.translatedText]));
    return Object.fromEntries(texts.map((t) => [t, found.get(t) ?? t]));
  }

  /** Upserts placeholder entries (translatedText = sourceText) for any new
   * names the scraper encounters, so translation stays eventually-consistent
   * without ever blocking on a missing dictionary entry. */
  async ensureEntries(texts: string[], category = ''): Promise<void> {
    const unique = [...new Set(texts.filter(Boolean))];
    await Promise.all(
      unique.map((sourceText) =>
        this.prisma.nameTranslation.upsert({
          where: { sourceText },
          update: {},
          create: { sourceText, translatedText: sourceText, category },
        }),
      ),
    );
  }
}
