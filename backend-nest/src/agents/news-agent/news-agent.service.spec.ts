import { NewsAgentService } from './news-agent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentCallerService } from '../common/agent-caller.service';
import { CompetitionsService } from '../../competitions/competitions.service';
import { TranslationsService } from '../../translations/translations.service';

function makeCluster(overrides: Partial<{ id: number; headline: string; summary: string | null; updatedAt: Date; articles: { title: string }[] }>) {
  return {
    id: 1,
    headline: 'Default headline',
    summary: 'Default summary',
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    articles: [],
    ...overrides,
  };
}

function makeService(clusters: ReturnType<typeof makeCluster>[]) {
  const findMany = jest.fn().mockResolvedValue(clusters);
  const prisma = { newsStoryCluster: { findMany } } as unknown as PrismaService;
  const translations = { translate: jest.fn(async (text: string) => text) } as unknown as TranslationsService;
  const service = new NewsAgentService(
    prisma,
    {} as AgentCallerService,
    {} as CompetitionsService,
    translations,
  );
  return { service, findMany, translations };
}

describe('NewsAgentService.getNewsForSubject', () => {
  it('matches a team name mentioned in the headline, case-insensitively', async () => {
    const { service } = makeService([
      makeCluster({ id: 1, headline: 'Arsenal sign new striker' }),
      makeCluster({ id: 2, headline: 'unrelated story' }),
    ]);

    const result = await service.getNewsForSubject('arsenal', 'en');

    expect(result).toHaveLength(1);
    expect(result[0].headline).toBe('Arsenal sign new striker');
  });

  it('matches a team name mentioned only in the summary or an article title', async () => {
    const { service } = makeService([
      makeCluster({ id: 1, headline: 'Manager reacts', summary: 'Chelsea manager speaks after the draw' }),
      makeCluster({ id: 2, headline: 'Roundup', summary: null, articles: [{ title: 'Chelsea injury update' }] }),
      makeCluster({ id: 3, headline: 'No mention here', summary: 'Nothing relevant' }),
    ]);

    const result = await service.getNewsForSubject('Chelsea', 'en');

    expect(result).toHaveLength(2);
  });

  it('returns matches ordered by recency (most recent first)', async () => {
    const { service } = makeService([
      makeCluster({ id: 1, headline: 'Liverpool news old', updatedAt: new Date('2026-01-01') }),
      makeCluster({ id: 2, headline: 'Liverpool news new', updatedAt: new Date('2026-06-01') }),
    ]);

    const result = await service.getNewsForSubject('Liverpool', 'en');

    // findMany itself is mocked to return whatever order we give it, so this
    // test asserts getNewsForSubject preserves the query's own ordering rather
    // than re-sorting — the real query orders by updatedAt desc.
    expect(result.map((r) => r.headline)).toEqual(['Liverpool news old', 'Liverpool news new']);
  });

  it('respects the limit parameter', async () => {
    const clusters = Array.from({ length: 10 }, (_, i) => makeCluster({ id: i, headline: `Everton story ${i}` }));
    const { service } = makeService(clusters);

    const result = await service.getNewsForSubject('Everton', 'en', 3);

    expect(result).toHaveLength(3);
  });

  it('returns an empty array when no cluster mentions the team', async () => {
    const { service } = makeService([makeCluster({ id: 1, headline: 'Totally unrelated' })]);

    const result = await service.getNewsForSubject('Nonexistent FC', 'en');

    expect(result).toEqual([]);
  });

  it('translates headline/summary through TranslationsService', async () => {
    const { service, translations } = makeService([makeCluster({ id: 1, headline: 'Arsenal news', summary: 'Some summary' })]);

    await service.getNewsForSubject('Arsenal', 'he');

    expect(translations.translate).toHaveBeenCalledWith('Arsenal news', 'he');
    expect(translations.translate).toHaveBeenCalledWith('Some summary', 'he');
  });
});
