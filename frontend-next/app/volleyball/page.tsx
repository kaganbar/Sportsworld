"use client";

import ThemeLayout from "@/components/theme-layout";
import CompetitionPicker from "@/components/competition-picker";

export default function VolleyballGames() {
  return (
    <ThemeLayout sport="volleyball">
      <CompetitionPicker sport="volleyball" basePath="/volleyball" />
    </ThemeLayout>
  );
}
