import { z } from 'zod';

export const NewsClusterSummarySchema = z.object({
  headline: z.string().describe('A single concise headline capturing the common story across all the articles'),
  summary: z.string().describe('2-3 sentence neutral summary synthesizing the articles into one coherent story'),
  headlineHe: z
    .string()
    .describe(
      'The same headline written natively in Hebrew, in the idiomatic style of a professional Hebrew sports ' +
        'desk (e.g. Sport5/One) — not a literal or machine translation of the English headline. Concise, ' +
        'grammatically natural Hebrew word order and phrasing.',
    ),
  summaryHe: z
    .string()
    .describe(
      'The same 2-3 sentence neutral synthesis written natively in Hebrew, professional Hebrew sports-' +
        'journalism style — not a literal or machine translation of the English summary. Should read as if ' +
        'originally written in Hebrew, not derived from the English text.',
    ),
});

export type NewsClusterSummary = z.infer<typeof NewsClusterSummarySchema>;
