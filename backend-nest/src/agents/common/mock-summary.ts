import { Lang } from '../../common/lang.decorator';

// The bilingual placeholder summary/key_factors text was byte-identical
// across all 5 sport agents' mockAnalysis() methods — only the probabilities
// object shape differs per sport (2-way vs 3-way, team vs player fields),
// so that part stays in each agent.
export function mockSummaryAndKeyFactors(subjectA: string, subjectB: string, lang: Lang) {
  const summary =
    lang === 'he'
      ? `[מדומה] ניתוח לדוגמה לקראת ${subjectA} מול ${subjectB}. ` +
        'זהו טקסט קבוע מראש לצורכי פיתוח — לא בוצעה קריאה אמיתית ל-Claude. ' +
        'עברו למצב live (AI_AGENT_MODE=live) עם מפתח API תקין לקבלת ניתוח אמיתי.'
      : `[Mock] Simulated pre-match analysis for ${subjectA} vs ${subjectB}. ` +
        'This is fixed placeholder text for development — no real Claude API call ' +
        'was made. Set AI_AGENT_MODE=live with a valid ANTHROPIC_API_KEY for real analysis.';
  const keyFactors =
    lang === 'he'
      ? ['[מדומה] גורם מפתח לדוגמה מספר אחד', '[מדומה] גורם מפתח לדוגמה מספר שתיים', '[מדומה] גורם מפתח לדוגמה מספר שלוש']
      : ['[Mock] Placeholder key factor one', '[Mock] Placeholder key factor two', '[Mock] Placeholder key factor three'];

  return { summary, key_factors: keyFactors };
}
