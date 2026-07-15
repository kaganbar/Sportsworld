import { z } from 'zod';

export const VolleyballAnalysisSchema = z.object({
  summary: z.string().describe('2-4 paragraph written match analysis in a professional sports-analyst tone'),
  key_factors: z.array(z.string()).describe('3-6 short bullets on what is driving the prediction'),
  probabilities: z.object({
    home_win: z.number().int().describe('0-100 integer probability the home team wins'),
    away_win: z.number().int().describe('0-100 integer probability the away team wins'),
  }),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type VolleyballAnalysis = z.infer<typeof VolleyballAnalysisSchema>;
