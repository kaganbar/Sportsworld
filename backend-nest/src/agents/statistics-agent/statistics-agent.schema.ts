import { z } from 'zod';

// Real-data-only narrative digest — no probabilities here (that's Prediction
// Agent's job) and explicitly no fabricated advanced metrics: only recent
// form, head-to-head-free single-subject stats (wins/draws/losses/goals) are
// ever in context, so the prompt constrains the model to those.
export const StatisticsAnalysisOutputSchema = z.object({
  summary: z.string().describe('2-3 paragraph narrative about this team or player\'s current form, grounded only in the provided data'),
  key_points: z.array(z.string()).describe('3-5 short bullets on the most notable statistical facts'),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type StatisticsAnalysisOutput = z.infer<typeof StatisticsAnalysisOutputSchema>;
