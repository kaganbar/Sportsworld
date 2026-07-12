-- DropIndex
DROP INDEX "Competition_slug_key";

-- DropIndex
DROP INDEX "Competition_sportKey_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Competition_sportKey_slug_key" ON "Competition"("sportKey", "slug");
