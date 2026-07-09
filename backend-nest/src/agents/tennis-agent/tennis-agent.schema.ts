import { z } from 'zod';

export const TennisAnalysisSchema = z.object({
  summary: z.string().describe('2-4 paragraph written match analysis in a professional sports-analyst tone'),
  key_factors: z.array(z.string()).describe('3-6 short bullets on what is driving the prediction'),
  probabilities: z.object({
    player1_win: z.number().int().describe('0-100 integer probability player 1 wins'),
    player2_win: z.number().int().describe('0-100 integer probability player 2 wins'),
  }),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type TennisAnalysis = z.infer<typeof TennisAnalysisSchema>;
