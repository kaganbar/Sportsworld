/**
 * One-time backfill: generates the Hebrew fields (`headlineHe`/`summaryHe`
 * on NewsStoryCluster, `aiSummaryHe` on TransferStory) for rows that already
 * have English content from before those fields existed. NewsAgentService
 * .clusterAndSummarize() / TransferAgentService.groupAndScoreStories() were
 * changed to pick these rows back up (see their `OR: [{..null}, {headlineHe/
 * aiSummaryHe: null}]` query conditions) — this script just drives repeated
 * calls to those exact methods (via real Nest DI, so it reuses their exact
 * system prompts/schemas/persistence logic) until every row is caught up,
 * working around the shared 20-calls/60s AgentCallerService rate limit
 * (RateLimitExceededError aborts the rest of a batch with no retry) by
 * catching the error, sleeping past the window, and calling again.
 *
 * Idempotent/safe-to-re-run: each call only touches rows still missing a
 * Hebrew field, so re-running after a partial run (or after it's already
 * fully caught up) just does nothing extra.
 *
 * Usage: npm run backfill:hebrew-content
 * (run detached — this can take tens of minutes against a real backlog):
 *   nohup npx ts-node prisma/backfill-hebrew-content.ts > /tmp/backfill-hebrew.log 2>&1 &
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisModule } from '../src/redis/redis.module';
import { TranslationsModule } from '../src/translations/translations.module';
import { CompetitionsModule } from '../src/competitions/competitions.module';
import { AgentsCommonModule } from '../src/agents/common/agents-common.module';
import { NewsAgentService } from '../src/agents/news-agent/news-agent.service';
import { TransferAgentService } from '../src/agents/transfer-agent/transfer-agent.service';

// Deliberately NOT `NestFactory.createApplicationContext(AppModule)` (the
// obvious choice, and what src/main.ts's own bootstrap() is based on) and
// NOT importing NewsAgentModule/TransferAgentModule directly either — two
// separate landmines:
//   1. Full AppModule pulls in WebsocketsModule's LiveGateway, whose
//      onModuleInit() dereferences HttpAdapterHost.httpAdapter to attach to
//      the HTTP server's 'upgrade' event — that adapter is only ever
//      populated by NestFactory.create() (a full app with an HTTP server),
//      not createApplicationContext() (DI-only, no server), so bootstrapping
//      AppModule this way throws immediately at startup.
//   2. NewsAgentModule/TransferAgentModule each also declare their own
//      *SchedulerService (NewsAgentSchedulerService/TransferAgentScheduler-
//      Service) as providers, and each of those runs its own
//      clusterAndSummarize()/groupAndScoreStories() call the instant it's
//      instantiated (OnApplicationBootstrap), *concurrently* with this
//      script's own driving loop — confirmed happening (duplicate
//      "clustered N article(s)" log lines) the first time this was tried.
//      That's a real race against the same unprocessed rows, not just
//      wasted rate-limit budget.
// So this reimplements just enough of a module to get the real
// NewsAgentService/TransferAgentService instances via real DI (same
// reviewed prompts/schemas/persistence) — providing them directly, from
// their own service files, alongside the @Global infra modules they need,
// without either service's own module (and its scheduler) in the graph.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    TranslationsModule,
    CompetitionsModule,
    AgentsCommonModule,
  ],
  providers: [NewsAgentService, TransferAgentService],
})
class BackfillBootstrapModule {}

const RETRY_DELAY_MS = 65_000; // a bit over the 60s rate-limit window
const MAX_ATTEMPTS_PER_SERVICE = 120; // ~2 hours at RETRY_DELAY_MS pace, comfortably above the expected ~35-45 min

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function newsRemaining(prisma: PrismaService): Promise<number> {
  return prisma.newsStoryCluster.count({ where: { OR: [{ summary: null }, { headlineHe: null }] } });
}

async function transfersRemaining(prisma: PrismaService): Promise<number> {
  return prisma.transferStory.count({ where: { OR: [{ estimatedProbability: null }, { aiSummaryHe: null }] } });
}

/** Repeatedly invokes `runBatch` (which processes as much as it can before
 * either finishing or throwing on a rate limit) until `remaining` reports 0,
 * retrying after RETRY_DELAY_MS on any thrown error. */
async function drive(name: string, runBatch: () => Promise<void>, remaining: () => Promise<number>) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_SERVICE; attempt++) {
    try {
      await runBatch();
    } catch (err) {
      log(`${name}: attempt ${attempt} threw: ${(err as Error).message} — waiting ${RETRY_DELAY_MS / 1000}s before retrying`);
      await sleep(RETRY_DELAY_MS);
      continue;
    }

    const left = await remaining();
    log(`${name}: ${left} row(s) still need Hebrew content after attempt ${attempt}`);
    if (left === 0) {
      log(`${name}: done.`);
      return;
    }
    await sleep(RETRY_DELAY_MS);
  }
  console.error(`${name}: gave up after ${MAX_ATTEMPTS_PER_SERVICE} attempts — some rows may be structurally unable to succeed. Check logs above.`);
}

async function main() {
  const app = await NestFactory.createApplicationContext(BackfillBootstrapModule);
  const prisma = app.get(PrismaService);
  const newsAgent = app.get(NewsAgentService);
  const transferAgent = app.get(TransferAgentService);

  const newsStart = await newsRemaining(prisma);
  const transfersStart = await transfersRemaining(prisma);
  log(`Starting backfill: NewsStoryCluster ${newsStart} row(s) pending, TransferStory ${transfersStart} row(s) pending`);

  await drive('NewsStoryCluster', () => newsAgent.clusterAndSummarize(), () => newsRemaining(prisma));
  await drive('TransferStory', () => transferAgent.groupAndScoreStories(), () => transfersRemaining(prisma));

  log('Backfill complete.');
  await app.close();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
