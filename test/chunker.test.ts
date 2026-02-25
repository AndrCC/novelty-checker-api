import { describe, expect, it } from "vitest";
import { chunkParagraphs } from "../src/core/chunker.js";

describe("chunkParagraphs", () => {
  it("splits by blank lines", () => {
    const text = "a\n\na2\n\n\nb";
    expect(chunkParagraphs(text)).toEqual(["a", "a2", "b"]);
  });

  it("trims and removes empty chunks", () => {
    const text = "\n\n  x  \n\n   \n\n y ";
    expect(chunkParagraphs(text)).toEqual(["x", "y"]);
  });

  it("returns [] for empty input", () => {
    expect(chunkParagraphs("   ")).toEqual([]);
  });
});