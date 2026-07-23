-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('goal', 'penalty_goal', 'own_goal', 'yellow_card', 'red_card', 'substitution', 'var_review');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "coachName" TEXT,
ADD COLUMN     "logoUrl" TEXT;

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "stoppageMinute" INTEGER,
    "type" "MatchEventType" NOT NULL,
    "teamId" INTEGER NOT NULL,
    "playerId" INTEGER,
    "relatedPlayerId" INTEGER,
    "detail" TEXT,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchEvent_gameId_idx" ON "MatchEvent"("gameId");

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_relatedPlayerId_fkey" FOREIGN KEY ("relatedPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
