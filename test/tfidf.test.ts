import { describe, expect, it } from "vitest";
import { buildIdf, tfidfVector } from "../src/core/tfidf.js";

describe("buildIdf", () => {
  it("assigns lower idf to more frequent terms", () => {
    const idf = buildIdf([
      "gato preto",
      "gato branco",
      "cachorro branco"
    ]);

    const gato = idf.get("gato")!;
    const preto = idf.get("preto")!;

    expect(gato).toBeLessThan(preto);
  });
});

describe("tfidfVector", () => {
  it("builds a sparse vector with positive weights", () => {
    const idf = buildIdf([
      "gato preto",
      "gato branco"
    ]);

    const vec = tfidfVector("gato preto preto", idf);

    expect(vec.get("gato")).toBeDefined();
    expect(vec.get("preto")).toBeDefined();
    expect((vec.get("preto") ?? 0)).toBeGreaterThan(0);
  });

  it("returns empty vector for text with tokens outside the vocab", () => {
    const idf = buildIdf(["gato preto"]);
    const vec = tfidfVector("astronomia quântica", idf);

    expect(vec.size).toBe(0);
  });
});