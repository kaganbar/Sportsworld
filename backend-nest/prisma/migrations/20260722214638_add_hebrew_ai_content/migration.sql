-- AlterTable
ALTER TABLE "NewsStoryCluster" ADD COLUMN     "headlineHe" TEXT,
ADD COLUMN     "summaryHe" TEXT;

-- AlterTable
ALTER TABLE "TransferStory" ADD COLUMN     "aiSummaryHe" TEXT;
