import { describe, expect, it } from "vitest";
import { cosineSimilarity, type SparseVec } from "../src/core/similarity.js";

function vec(entries: Array<[string, number]>): SparseVec {
  return new Map(entries);
}

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const a = vec([
      ["gato", 1],
      ["preto", 2],
    ]);

    const b = vec([
      ["gato", 1],
      ["preto", 2],
    ]);

    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it("returns 0 for disjoint vectors", () => {
    const a = vec([["gato", 1]]);
    const b = vec([["cachorro", 1]]);

    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("returns 0 if one vector is empty", () => {
    const a = vec([]);
    const b = vec([["texto", 1]]);

    expect(cosineSimilarity(a, b)).toBe(0);
  });
});