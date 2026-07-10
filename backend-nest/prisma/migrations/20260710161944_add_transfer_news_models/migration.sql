-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('rumor', 'official', 'completed', 'denied');

-- CreateTable
CREATE TABLE "ContentSource" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "credibilityScore" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferStory" (
    "id" SERIAL NOT NULL,
    "playerName" TEXT NOT NULL,
    "fromClub" TEXT,
    "toClub" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'rumor',
    "estimatedProbability" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferReport" (
    "id" SERIAL NOT NULL,
    "storyId" INTEGER,
    "sourceId" INTEGER NOT NULL,
    "playerName" TEXT NOT NULL,
    "fromClub" TEXT,
    "toClub" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'rumor',
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsStoryCluster" (
    "id" SERIAL NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT,
    "sport" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsStoryCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" SERIAL NOT NULL,
    "clusterId" INTEGER,
    "sourceId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentSource_name_key" ON "ContentSource"("name");

-- CreateIndex
CREATE INDEX "TransferStory_playerName_idx" ON "TransferStory"("playerName");

-- CreateIndex
CREATE INDEX "TransferReport_storyId_idx" ON "TransferReport"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_url_key" ON "NewsArticle"("url");

-- CreateIndex
CREATE INDEX "NewsArticle_clusterId_idx" ON "NewsArticle"("clusterId");

-- AddForeignKey
ALTER TABLE "TransferReport" ADD CONSTRAINT "TransferReport_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "TransferStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferReport" ADD CONSTRAINT "TransferReport_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ContentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "NewsStoryCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ContentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
