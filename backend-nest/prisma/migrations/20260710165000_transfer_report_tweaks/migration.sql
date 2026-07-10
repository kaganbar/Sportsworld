-- AlterTable
ALTER TABLE "TransferReport" ADD COLUMN     "sourceProbability" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "TransferReport_sourceUrl_key" ON "TransferReport"("sourceUrl");
