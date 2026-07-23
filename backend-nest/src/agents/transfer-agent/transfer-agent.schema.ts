import { z } from 'zod';

// Per-story assessment: kept deliberately separate from
// TransferReport.sourceProbability (a source's own published %) — this is
// our own agent's estimate, never conflated with a real scraped data point.
export const TransferStoryAssessmentSchema = z.object({
  probability: z.number().int().describe('0-100 integer estimate that this transfer will actually happen, weighing source count and credibility'),
  summary: z.string().describe('1-2 sentence synthesis of all reports about this transfer story'),
  summaryHe: z
    .string()
    .describe(
      '1-2 sentence synthesis of the story written natively in Hebrew, professional Hebrew sports-' +
        'journalism style (transfer-market reporting, e.g. as read on a Hebrew sports site) — not a literal ' +
        'or machine translation of the English summary field.',
    ),
});

export type TransferStoryAssessment = z.infer<typeof TransferStoryAssessmentSchema>;
