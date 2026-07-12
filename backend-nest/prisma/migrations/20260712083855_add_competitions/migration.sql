-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "competitionId" INTEGER;

-- AlterTable
ALTER TABLE "MatchResult" ADD COLUMN     "competitionId" INTEGER;

-- AlterTable
ALTER TABLE "TennisMatch" ADD COLUMN     "competitionId" INTEGER;

-- CreateTable
CREATE TABLE "Competition" (
    "id" SERIAL NOT NULL,
    "sportKey" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 99,
    "aliases" TEXT[],

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCompetition" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "competitionId" INTEGER NOT NULL,

    CONSTRAINT "TeamCompetition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CompetitionToNewsStoryCluster" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_CompetitionToTransferStory" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");

-- CreateIndex
CREATE INDEX "Competition_sportKey_idx" ON "Competition"("sportKey");

-- CreateIndex
CREATE UNIQUE INDEX "TeamCompetition_teamId_competitionId_key" ON "TeamCompetition"("teamId", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "_CompetitionToNewsStoryCluster_AB_unique" ON "_CompetitionToNewsStoryCluster"("A", "B");

-- CreateIndex
CREATE INDEX "_CompetitionToNewsStoryCluster_B_index" ON "_CompetitionToNewsStoryCluster"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CompetitionToTransferStory_AB_unique" ON "_CompetitionToTransferStory"("A", "B");

-- CreateIndex
CREATE INDEX "_CompetitionToTransferStory_B_index" ON "_CompetitionToTransferStory"("B");

-- CreateIndex
CREATE INDEX "Game_competitionId_idx" ON "Game"("competitionId");

-- CreateIndex
CREATE INDEX "MatchResult_competitionId_idx" ON "MatchResult"("competitionId");

-- CreateIndex
CREATE INDEX "TennisMatch_competitionId_idx" ON "TennisMatch"("competitionId");

-- AddForeignKey
ALTER TABLE "TeamCompetition" ADD CONSTRAINT "TeamCompetition_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCompetition" ADD CONSTRAINT "TeamCompetition_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TennisMatch" ADD CONSTRAINT "TennisMatch_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompetitionToNewsStoryCluster" ADD CONSTRAINT "_CompetitionToNewsStoryCluster_A_fkey" FOREIGN KEY ("A") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompetitionToNewsStoryCluster" ADD CONSTRAINT "_CompetitionToNewsStoryCluster_B_fkey" FOREIGN KEY ("B") REFERENCES "NewsStoryCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompetitionToTransferStory" ADD CONSTRAINT "_CompetitionToTransferStory_A_fkey" FOREIGN KEY ("A") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompetitionToTransferStory" ADD CONSTRAINT "_CompetitionToTransferStory_B_fkey" FOREIGN KEY ("B") REFERENCES "TransferStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
