"use client";

import ThemeLayout from "@/components/theme-layout";
import CompetitionPicker from "@/components/competition-picker";

export default function BasketballGames() {
  return (
    <ThemeLayout sport="basketball">
      <CompetitionPicker sport="basketball" basePath="/basketball" />
    </ThemeLayout>
  );
}
