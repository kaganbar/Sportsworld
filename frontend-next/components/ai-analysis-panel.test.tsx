import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AiAnalysisPanel, { AgentAnalysisBase, ProbabilitySegment } from "./ai-analysis-panel";
import { ApiError } from "@/lib/api";

// useLang() falls back to LangContext's default value (Hebrew) when no
// <LanguageProvider> wraps the tree, so these tests don't need one.

type TestAnalysis = AgentAnalysisBase;

const segments: (a: TestAnalysis) => ProbabilitySegment[] = () => [
  { key: "home", label: "Home", pct: 60, className: "home" },
  { key: "away", label: "Away", pct: 40, className: "away" },
];

const sampleAnalysis: TestAnalysis = {
  summary: "A close match expected.",
  key_factors: ["Strong recent form", "Home advantage"],
  confidence: "high",
  model: "claude-test",
  created_at: new Date().toISOString(),
};

describe("AiAnalysisPanel", () => {
  it("shows a loading state before the fetch resolves", () => {
    const fetchAnalysis = vi.fn(() => new Promise<TestAnalysis>(() => {})); // never resolves
    render(<AiAnalysisPanel id="1" fetchAnalysis={fetchAnalysis} probabilitySegments={segments} />);

    expect(screen.queryByText(sampleAnalysis.summary)).not.toBeInTheDocument();
  });

  it("renders the summary, probability segments, and key factors on success", async () => {
    const fetchAnalysis = vi.fn().mockResolvedValue(sampleAnalysis);
    render(<AiAnalysisPanel id="1" fetchAnalysis={fetchAnalysis} probabilitySegments={segments} />);

    await waitFor(() => expect(screen.getByText(sampleAnalysis.summary)).toBeInTheDocument());

    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("Strong recent form")).toBeInTheDocument();
    expect(fetchAnalysis).toHaveBeenCalledWith("1", expect.any(String));
  });

  it("renders the ApiError message on failure", async () => {
    const fetchAnalysis = vi.fn().mockRejectedValue(new ApiError(503, "Analysis temporarily unavailable."));
    render(<AiAnalysisPanel id="1" fetchAnalysis={fetchAnalysis} probabilitySegments={segments} />);

    await waitFor(() => expect(screen.getByText("Analysis temporarily unavailable.")).toBeInTheDocument());
  });
});
