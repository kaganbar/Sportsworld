import { z } from 'zod';

export const NewsClusterSummarySchema = z.object({
  headline: z.string().describe('A single concise headline capturing the common story across all the articles'),
  summary: z.string().describe('2-3 sentence neutral summary synthesizing the articles into one coherent story'),
});

export type NewsClusterSummary = z.infer<typeof NewsClusterSummarySchema>;
