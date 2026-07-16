-- CreateIndex
CREATE INDEX "Game_sport_status_idx" ON "Game"("sport", "status");

-- CreateIndex
CREATE INDEX "Game_sport_kickoff_idx" ON "Game"("sport", "kickoff");

-- CreateIndex
CREATE INDEX "TennisMatch_status_idx" ON "TennisMatch"("status");

-- CreateIndex
CREATE INDEX "TennisMatch_startTime_idx" ON "TennisMatch"("startTime");
