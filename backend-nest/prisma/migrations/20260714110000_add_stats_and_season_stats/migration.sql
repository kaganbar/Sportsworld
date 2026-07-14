-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "stats" JSONB;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "seasonStats" JSONB;

-- AlterTable
ALTER TABLE "TennisMatch" ADD COLUMN     "stats" JSONB;

-- AlterTable
ALTER TABLE "TennisPlayer" ADD COLUMN     "acesPerMatch" DOUBLE PRECISION,
ADD COLUMN     "winPct" DOUBLE PRECISION;
