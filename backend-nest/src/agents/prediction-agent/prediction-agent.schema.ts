import { z } from 'zod';

// Two shapes because football is a 3-way outcome (draw possible) and
// basketball/tennis are 2-way. Labels are deliberately generic ("option
// A/B") rather than home/away or player1/player2 since this schema is
// shared across sports where the two "sides" mean different things.
export const PredictionThreeWaySchema = z.object({
  prediction: z.string().describe('2-3 paragraph independent prediction, explicitly framed as an estimate, never a guarantee'),
  key_factors: z.array(z.string()).describe('3-6 short bullets on what is driving the prediction'),
  probabilities: z.object({
    option_a_win: z.number().int().describe('0-100 integer probability the first side (home team) wins'),
    draw: z.number().int().describe('0-100 integer probability of a draw'),
    option_b_win: z.number().int().describe('0-100 integer probability the second side (away team) wins'),
  }),
  confidence: z.enum(['low', 'medium', 'high']),
});

export const PredictionTwoWaySchema = z.object({
  prediction: z.string().describe('2-3 paragraph independent prediction, explicitly framed as an estimate, never a guarantee'),
  key_factors: z.array(z.string()).describe('3-6 short bullets on what is driving the prediction'),
  probabilities: z.object({
    option_a_win: z.number().int().describe('0-100 integer probability the first side wins'),
    option_b_win: z.number().int().describe('0-100 integer probability the second side wins'),
  }),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type PredictionThreeWay = z.infer<typeof PredictionThreeWaySchema>;
export type PredictionTwoWay = z.infer<typeof PredictionTwoWaySchema>;
