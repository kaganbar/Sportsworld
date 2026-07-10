import { Injectable, Logger } from '@nestjs/common';
import { Lang } from '../../common/lang.decorator';
import { AgentCallerService } from '../common/agent-caller.service';
import { GeneralSportsAnswerSchema, GeneralSportsAnswer } from './general-sports-agent.schema';

const SYSTEM_PROMPT = `You are the SportsWorld General Sports Agent. You answer general
sports questions — rules, history, records, general commentary — for sports that don't
have their own dedicated agent on this platform (e.g. baseball, volleyball), or general
questions that aren't tied to a specific live fixture.

You have no live fixture, team, or player data for these sports — answer from your own
knowledge. Be clear when something is time-sensitive (current rosters, active records)
and your knowledge may be out of date. Do not fabricate specific recent results or
statistics you're not confident about.`;

const LANGUAGE_INSTRUCTIONS: Record<Lang, string> = {
  en: '',
  he: '\n\nWrite the answer and key_points in Hebrew (עברית).',
};

// Unlike every other agent, this one has no DB context to build (there is no
// real baseball/volleyball fixture data in this schema — confirmed scope
// decision) and no per-subject cache table: a free-text question rarely
// repeats verbatim, and it's a cheap single-shot call, so there's nothing
// worth caching against.
@Injectable()
export class GeneralSportsAgentService {
  private readonly logger = new Logger(GeneralSportsAgentService.name);

  constructor(private readonly agentCaller: AgentCallerService) {}

  private mockAnswer(question: string, lang: Lang): GeneralSportsAnswer {
    const answer =
      lang === 'he'
        ? `[מדומה] תשובה לדוגמה לשאלה: "${question}". ` +
          'זהו טקסט קבוע מראש לצורכי פיתוח — לא בוצעה קריאה אמיתית ל-Claude. ' +
          'עברו למצב live (AI_AGENT_MODE=live) עם מפתח API תקין לקבלת תשובה אמיתית.'
        : `[Mock] Simulated answer to: "${question}". ` +
          'This is fixed placeholder text for development — no real Claude API call ' +
          'was made. Set AI_AGENT_MODE=live with a valid ANTHROPIC_API_KEY for a real answer.';
    const keyPoints =
      lang === 'he'
        ? ['[מדומה] נקודת מפתח לדוגמה מספר אחד', '[מדומה] נקודת מפתח לדוגמה מספר שתיים']
        : ['[Mock] Placeholder key point one', '[Mock] Placeholder key point two'];

    return { answer, key_points: keyPoints, confidence: 'medium' };
  }

  async ask(question: string, lang: Lang) {
    this.logger.log(`General sports question (lang=${lang}): ${question.slice(0, 80)}`);
    const [result, modelLabel] = await this.agentCaller.call<GeneralSportsAnswer>({
      outputSchema: GeneralSportsAnswerSchema,
      system: SYSTEM_PROMPT + LANGUAGE_INSTRUCTIONS[lang],
      context: { question },
      mockFactory: (ctx: any) => this.mockAnswer(ctx.question, lang),
    });

    return {
      answer: result.answer,
      key_points: result.key_points,
      confidence: result.confidence,
      model: modelLabel,
    };
  }
}
