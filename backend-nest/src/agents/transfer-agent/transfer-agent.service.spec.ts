import { TransferAgentService } from './transfer-agent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentCallerService } from '../common/agent-caller.service';
import { CompetitionsService } from '../../competitions/competitions.service';

function makeDeps() {
  const prisma = {
    transferReport: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    transferStory: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
      update: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;

  const agentCaller = {
    call: jest.fn().mockResolvedValue([{ probability: 65, summary: 'Likely to happen.' }, 'claude-test-model']),
  } as unknown as AgentCallerService;

  const competitions = {
    competitionsForText: jest.fn().mockResolvedValue([]),
  } as unknown as CompetitionsService;

  return { prisma, agentCaller, competitions };
}

describe('TransferAgentService', () => {
  describe('groupAndScoreStories -> groupUngroupedReports', () => {
    it('creates a new story for a report with no existing match', async () => {
      const deps = makeDeps();
      (deps.prisma.transferReport.findMany as jest.Mock).mockResolvedValue([
        { id: 10, playerName: 'Erling Haaland', fromClub: 'Man City', toClub: 'Real Madrid', status: 'rumor' },
      ]);
      (deps.prisma.transferStory.findMany as jest.Mock).mockResolvedValue([]);
      const service = new TransferAgentService(deps.prisma, deps.agentCaller, deps.competitions);

      await service.groupAndScoreStories();

      expect(deps.prisma.transferStory.create).toHaveBeenCalledWith({
        data: { playerName: 'Erling Haaland', fromClub: 'Man City', toClub: 'Real Madrid', status: 'rumor' },
      });
      expect(deps.prisma.transferReport.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { storyId: 1 } });
    });

    it('links a report to an existing story matched case-insensitively on player + destination club', async () => {
      const deps = makeDeps();
      (deps.prisma.transferReport.findMany as jest.Mock).mockResolvedValue([
        { id: 11, playerName: 'erling haaland', fromClub: 'Man City', toClub: 'REAL MADRID', status: 'rumor' },
      ]);
      // transferStory.findMany is called by both groupUngroupedReports (the
      // match lookup) and scoreUnscoredStories (unscored-story lookup) —
      // this mock backs both call sites, so it needs a `reports` field or
      // scoreUnscoredStories crashes on story.reports.length.
      (deps.prisma.transferStory.findMany as jest.Mock).mockResolvedValue([
        { id: 5, playerName: 'Erling Haaland', toClub: 'Real Madrid', reports: [] },
      ]);
      const service = new TransferAgentService(deps.prisma, deps.agentCaller, deps.competitions);

      await service.groupAndScoreStories();

      expect(deps.prisma.transferStory.create).not.toHaveBeenCalled();
      expect(deps.prisma.transferReport.update).toHaveBeenCalledWith({ where: { id: 11 }, data: { storyId: 5 } });
    });
  });

  describe('groupAndScoreStories -> scoreUnscoredStories', () => {
    it('scores a story and clamps the probability into 0-100', async () => {
      const deps = makeDeps();
      (deps.agentCaller.call as jest.Mock).mockResolvedValue([{ probability: 142, summary: 'Very likely.' }, 'claude-test-model']);
      (deps.prisma.transferStory.findMany as jest.Mock).mockResolvedValue([
        {
          id: 7,
          playerName: 'Kylian Mbappe',
          fromClub: 'Real Madrid',
          toClub: 'PSG',
          reports: [
            { source: { name: 'L\'Equipe', credibilityScore: 90 }, description: 'Return rumor', sourceProbability: 30, reportedAt: new Date('2026-01-01') },
          ],
        },
      ]);
      const service = new TransferAgentService(deps.prisma, deps.agentCaller, deps.competitions);

      await service.groupAndScoreStories();

      expect(deps.prisma.transferStory.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { estimatedProbability: 100, aiSummary: 'Very likely.' },
      });
    });

    it('skips a story with no reports rather than calling the agent', async () => {
      const deps = makeDeps();
      (deps.prisma.transferStory.findMany as jest.Mock).mockResolvedValue([
        { id: 8, playerName: 'Nobody', fromClub: null, toClub: 'Nowhere FC', reports: [] },
      ]);
      const service = new TransferAgentService(deps.prisma, deps.agentCaller, deps.competitions);

      await service.groupAndScoreStories();

      expect(deps.agentCaller.call).not.toHaveBeenCalled();
      expect(deps.prisma.transferStory.update).not.toHaveBeenCalled();
    });
  });

  describe('listStories', () => {
    it('maps story + report rows to the API DTO shape', async () => {
      const deps = makeDeps();
      const prisma = {
        ...deps.prisma,
        transferStory: {
          ...deps.prisma.transferStory,
          findMany: jest.fn().mockResolvedValue([
            {
              id: 1,
              playerName: 'Jude Bellingham',
              fromClub: null,
              toClub: 'Liverpool',
              status: 'rumor',
              estimatedProbability: 22,
              aiSummary: 'Unlikely but persistent.',
              updatedAt: new Date('2026-02-01T00:00:00Z'),
              reports: [
                {
                  source: { name: 'Fabrizio Romano', credibilityScore: 95 },
                  description: 'Sources close to the player deny interest.',
                  sourceUrl: 'https://example.com/1',
                  sourceProbability: 15,
                  reportedAt: new Date('2026-01-30T00:00:00Z'),
                },
              ],
            },
          ]),
        },
      } as unknown as PrismaService;
      const service = new TransferAgentService(prisma, deps.agentCaller, deps.competitions);

      const result = await service.listStories();

      expect(result).toEqual([
        {
          id: 1,
          player_name: 'Jude Bellingham',
          from_club: null,
          to_club: 'Liverpool',
          status: 'rumor',
          estimated_probability: 22,
          ai_summary: 'Unlikely but persistent.',
          reports: [
            {
              source: 'Fabrizio Romano',
              source_credibility: 95,
              description: 'Sources close to the player deny interest.',
              source_url: 'https://example.com/1',
              source_probability: 15,
              reported_at: '2026-01-30T00:00:00.000Z',
            },
          ],
          updated_at: '2026-02-01T00:00:00.000Z',
        },
      ]);
    });
  });
});
