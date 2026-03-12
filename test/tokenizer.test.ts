import { describe, expect, it } from "vitest";
import { tokenize } from "../src/core/tokenizer.js";

describe("tokenize", () => {
  it("lowercases and strips punctuation", () => {
    expect(tokenize("Olá, Mundo! TESTE.")).toEqual(["olá", "mundo", "teste"]);
  });

  it("removes short noisy tokens", () => {
    expect(tokenize("a de o texto útil")).toEqual(["de", "texto", "útil"]);
  });

  it("returns empty array for empty-like input", () => {
    expect(tokenize("... ,,, !!!")).toEqual([]);
  });
});