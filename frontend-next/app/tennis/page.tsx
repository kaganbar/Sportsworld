"use client";

import ThemeLayout from "@/components/theme-layout";
import CompetitionPicker from "@/components/competition-picker";

export default function TennisMatches() {
  return (
    <ThemeLayout sport="tennis">
      <CompetitionPicker sport="tennis" basePath="/tennis" />
    </ThemeLayout>
  );
}
