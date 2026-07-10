-- AlterTable
ALTER TABLE "TransferStory" ADD COLUMN     "aiSummary" TEXT;

-- CreateTable
CREATE TABLE "StatisticsAnalysis" (
    "id" SERIAL NOT NULL,
    "sport" TEXT NOT NULL,
    "teamId" INTEGER,
    "tennisPlayerId" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'en',
    "summary" TEXT NOT NULL,
    "keyPoints" TEXT[],
    "confidence" "Confidence" NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatisticsAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionAnalysis" (
    "id" SERIAL NOT NULL,
    "sport" TEXT NOT NULL,
    "gameId" INTEGER,
    "tennisMatchId" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'en',
    "prediction" TEXT NOT NULL,
    "keyFactors" TEXT[],
    "probabilities" JSONB NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterReport" (
    "id" SERIAL NOT NULL,
    "queryHash" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "reportText" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StatisticsAnalysis_teamId_language_key" ON "StatisticsAnalysis"("teamId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "StatisticsAnalysis_tennisPlayerId_language_key" ON "StatisticsAnalysis"("tennisPlayerId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionAnalysis_gameId_language_key" ON "PredictionAnalysis"("gameId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionAnalysis_tennisMatchId_language_key" ON "PredictionAnalysis"("tennisMatchId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "MasterReport_queryHash_key" ON "MasterReport"("queryHash");

-- AddForeignKey
ALTER TABLE "StatisticsAnalysis" ADD CONSTRAINT "StatisticsAnalysis_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatisticsAnalysis" ADD CONSTRAINT "StatisticsAnalysis_tennisPlayerId_fkey" FOREIGN KEY ("tennisPlayerId") REFERENCES "TennisPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionAnalysis" ADD CONSTRAINT "PredictionAnalysis_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionAnalysis" ADD CONSTRAINT "PredictionAnalysis_tennisMatchId_fkey" FOREIGN KEY ("tennisMatchId") REFERENCES "TennisMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
