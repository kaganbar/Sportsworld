-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('football', 'basketball');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('scheduled', 'live', 'finished');

-- CreateEnum
CREATE TYPE "InjuryStatus" AS ENUM ('out', 'doubtful', 'suspended');

-- CreateEnum
CREATE TYPE "Tour" AS ENUM ('atp', 'wta');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "sport" "Sport" NOT NULL DEFAULT 'football',
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#1E7B34',

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "shirtNumber" INTEGER NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "sport" "Sport" NOT NULL DEFAULT 'football',
    "competition" TEXT NOT NULL,
    "kickoff" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'scheduled',
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "minute" INTEGER,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lineup" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "isStarting" BOOLEAN NOT NULL DEFAULT true,
    "position" TEXT NOT NULL,

    CONSTRAINT "Lineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "competition" TEXT NOT NULL,
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Injury" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "status" "InjuryStatus" NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "Injury_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterScore" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,

    CONSTRAINT "QuarterScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TennisPlayer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "tour" "Tour" NOT NULL,
    "ranking" INTEGER,

    CONSTRAINT "TennisPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TennisMatch" (
    "id" SERIAL NOT NULL,
    "tour" "Tour" NOT NULL,
    "tournament" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'scheduled',
    "player1Id" INTEGER NOT NULL,
    "player2Id" INTEGER NOT NULL,
    "winnerId" INTEGER,

    CONSTRAINT "TennisMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TennisSet" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "player1Games" INTEGER NOT NULL,
    "player2Games" INTEGER NOT NULL,

    CONSTRAINT "TennisSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameTranslation" (
    "id" SERIAL NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "NameTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchAnalysis" (
    "id" SERIAL NOT NULL,
    "sport" TEXT NOT NULL,
    "gameId" INTEGER,
    "tennisMatchId" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'en',
    "summary" TEXT NOT NULL,
    "keyFactors" TEXT[],
    "homeWinPct" INTEGER,
    "drawPct" INTEGER,
    "awayWinPct" INTEGER,
    "player1WinPct" INTEGER,
    "player2WinPct" INTEGER,
    "confidence" "Confidence" NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_teamId_shirtNumber_key" ON "Player"("teamId", "shirtNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Game_sport_competition_kickoff_homeTeamId_awayTeamId_key" ON "Game"("sport", "competition", "kickoff", "homeTeamId", "awayTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Lineup_gameId_playerId_key" ON "Lineup"("gameId", "playerId");

-- CreateIndex
CREATE INDEX "MatchResult_homeTeamId_idx" ON "MatchResult"("homeTeamId");

-- CreateIndex
CREATE INDEX "MatchResult_awayTeamId_idx" ON "MatchResult"("awayTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterScore_gameId_quarter_key" ON "QuarterScore"("gameId", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "TennisPlayer_name_key" ON "TennisPlayer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TennisMatch_tour_tournament_round_startTime_player1Id_playe_key" ON "TennisMatch"("tour", "tournament", "round", "startTime", "player1Id", "player2Id");

-- CreateIndex
CREATE UNIQUE INDEX "TennisSet_matchId_setNumber_key" ON "TennisSet"("matchId", "setNumber");

-- CreateIndex
CREATE UNIQUE INDEX "NameTranslation_sourceText_key" ON "NameTranslation"("sourceText");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAnalysis_gameId_language_key" ON "MatchAnalysis"("gameId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAnalysis_tennisMatchId_language_key" ON "MatchAnalysis"("tennisMatchId", "language");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Injury" ADD CONSTRAINT "Injury_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Injury" ADD CONSTRAINT "Injury_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterScore" ADD CONSTRAINT "QuarterScore_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TennisMatch" ADD CONSTRAINT "TennisMatch_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "TennisPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TennisMatch" ADD CONSTRAINT "TennisMatch_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "TennisPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TennisMatch" ADD CONSTRAINT "TennisMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "TennisPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TennisSet" ADD CONSTRAINT "TennisSet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "TennisMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAnalysis" ADD CONSTRAINT "MatchAnalysis_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAnalysis" ADD CONSTRAINT "MatchAnalysis_tennisMatchId_fkey" FOREIGN KEY ("tennisMatchId") REFERENCES "TennisMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
