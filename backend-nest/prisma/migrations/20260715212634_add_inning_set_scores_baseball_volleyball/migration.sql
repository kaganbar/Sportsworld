-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Sport" ADD VALUE 'baseball';
ALTER TYPE "Sport" ADD VALUE 'volleyball';

-- CreateTable
CREATE TABLE "InningScore" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "inning" INTEGER NOT NULL,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,

    CONSTRAINT "InningScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetScore" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,

    CONSTRAINT "SetScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InningScore_gameId_inning_key" ON "InningScore"("gameId", "inning");

-- CreateIndex
CREATE UNIQUE INDEX "SetScore_gameId_setNumber_key" ON "SetScore"("gameId", "setNumber");

-- AddForeignKey
ALTER TABLE "InningScore" ADD CONSTRAINT "InningScore_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetScore" ADD CONSTRAINT "SetScore_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
