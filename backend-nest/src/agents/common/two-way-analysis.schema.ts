import { z } from 'zod';

// Shared 2-way (no draw possible) match-analysis output shape — basketball,
// baseball, and volleyball all produced byte-identical copies of this same
// schema (only the exported name differed). One definition instead of three
// copy-pasted ones; each sport's own *-agent.schema.ts re-exports this under
// its historical name so no import elsewhere needs to change. Football's is
// a separate 3-way shape (draw is possible) and tennis's uses player1/
// player2 instead of home/away — neither fits this shared shape.
export const TwoWayAnalysisSchema = z.object({
  summary: z.string().describe('2-4 paragraph written match analysis in a professional sports-analyst tone'),
  key_factors: z.array(z.string()).describe('3-6 short bullets on what is driving the prediction'),
  probabilities: z.object({
    home_win: z.number().int().describe('0-100 integer probability the home team wins'),
    away_win: z.number().int().describe('0-100 integer probability the away team wins'),
  }),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type TwoWayAnalysis = z.infer<typeof TwoWayAnalysisSchema>;
