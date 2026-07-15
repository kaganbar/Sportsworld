"use client";

import ThemeLayout from "@/components/theme-layout";
import CompetitionPicker from "@/components/competition-picker";

export default function BaseballGames() {
  return (
    <ThemeLayout sport="baseball">
      <CompetitionPicker sport="baseball" basePath="/baseball" />
    </ThemeLayout>
  );
}
