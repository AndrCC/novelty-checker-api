export type NoveltyLabel = "redundant" | "needs_citation" | "novel";

export function labelFromMaxSimilarity(score: number): NoveltyLabel {
  if (score >= 0.75) return "redundant";
  if (score <= 0.35) return "novel";
  return "needs_citation";
}