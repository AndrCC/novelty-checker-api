import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db/pool.js";

describe("POST /corpora/:id/check", () => {
  it("runs the full novelty-check flow", async () => {
    const app = buildApp();

    let corpusId: string | undefined;

    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/corpora",
        payload: {
          name: "integration-test-corpus",
          documents: [
            {
              title: "review1",
              text: "Primeiro paragrafo.\n\nSegundo paragrafo.",
            },
            {
              title: "wiki",
              text: "Outro texto.\n\nMais um trecho.",
            },
          ],
        },
      });

      expect(createResponse.statusCode).toBe(201);

      const created = createResponse.json() as {
        corpusId: string;
        name: string;
        stats: { totalDocs: number; totalChunks: number };
      };

      corpusId = created.corpusId;

      expect(created.stats.totalDocs).toBe(2);
      expect(created.stats.totalChunks).toBe(4);

      const indexResponse = await app.inject({
        method: "POST",
        url: `/corpora/${corpusId}/index`,
        payload: {},
      });

      expect(indexResponse.statusCode).toBe(200);

      const indexed = indexResponse.json() as {
        corpusId: string;
        stats: { totalChunks: number; vocabSize: number };
      };

      expect(indexed.corpusId).toBe(corpusId);
      expect(indexed.stats.totalChunks).toBe(4);
      expect(indexed.stats.vocabSize).toBeGreaterThan(0);

      const checkResponse = await app.inject({
        method: "POST",
        url: `/corpora/${corpusId}/check`,
        payload: {
          text: "Primeiro paragrafo.\n\nUm trecho totalmente novo sobre astronomia.",
          topK: 3,
        },
      });

      expect(checkResponse.statusCode).toBe(200);

      const checked = checkResponse.json() as {
        summary: {
          totalChunks: number;
          redundantPct: number;
          avgNoveltyScore: number;
        };
        results: Array<{
          chunkIndex: number;
          maxSimilarity: number;
          label: "redundant" | "needs_citation" | "novel";
          matches: Array<{
            sourceTitle: string;
            similarity: number;
            excerpt: string;
          }>;
        }>;
      };

      expect(checked.summary.totalChunks).toBe(2);
      expect(checked.results).toHaveLength(2);

      expect(checked.results[0].chunkIndex).toBe(0);
      expect(checked.results[0].matches.length).toBeGreaterThan(0);

      expect(["redundant", "needs_citation", "novel"]).toContain(
        checked.results[0].label
      );
      expect(["redundant", "needs_citation", "novel"]).toContain(
        checked.results[1].label
      );
    } finally {
      if (corpusId) {
        await pool.query("delete from corpus where id = $1", [corpusId]);
      }

      await app.close();
    }
  });
});