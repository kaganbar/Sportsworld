"use client";

import ThemeLayout from "@/components/theme-layout";
import CompetitionPicker from "@/components/competition-picker";

export default function FootballGames() {
  return (
    <ThemeLayout sport="football">
      <CompetitionPicker sport="football" basePath="/football" />
    </ThemeLayout>
  );
}
