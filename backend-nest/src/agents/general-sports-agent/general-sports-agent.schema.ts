import { z } from 'zod';

export const GeneralSportsAnswerSchema = z.object({
  answer: z.string().describe('2-4 paragraph answer to the user\'s sports question, written in a knowledgeable, conversational tone'),
  key_points: z.array(z.string()).describe('2-5 short bullets highlighting the most important facts in the answer'),
  confidence: z.enum(['low', 'medium', 'high']).describe('How confident the answer is, given that no live fixture/team data backs it'),
});

export type GeneralSportsAnswer = z.infer<typeof GeneralSportsAnswerSchema>;
