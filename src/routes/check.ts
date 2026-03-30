import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { chunkParagraphs } from "../core/chunker.js";
import { cosineSimilarity } from "../core/similarity.js";
import { idfFromJson, tfidfVector } from "../core/tfidf.js";
import { labelFromMaxSimilarity } from "../core/labeler.js";

const CheckBody = z.object({
  text: z.string().min(1),
  topK: z.number().int().min(1).max(10).optional().default(3),
});

function excerpt(text: string, max = 140): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return normalized.slice(0, max - 1) + "…";
}

export async function checkRoutes(app: FastifyInstance) {
  app.post("/corpora/:id/check", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = CheckBody.parse(req.body);

    const indexResult = await pool.query(
      `
      select idf
      from corpus_index
      where corpus_id = $1
      `,
      [id]
    );

    if (indexResult.rowCount === 0) {
      return reply.code(409).send({
        error: "corpus not indexed; run /corpora/:id/index first"
      });
    }

    const idf = idfFromJson(indexResult.rows[0].idf as Record<string, number>);

    const corpusChunksResult = await pool.query(
      `
      select
        cd.title as source_title,
        cc.text as text
      from corpus_chunk cc
      join corpus_doc cd on cd.id = cc.doc_id
      where cc.corpus_id = $1
      order by cd.title, cc.chunk_index
      `,
      [id]
    );

    const corpusChunks = corpusChunksResult.rows.map((row) => ({
      sourceTitle: row.source_title as string,
      text: row.text as string,
      vec: tfidfVector(row.text as string, idf),
    }));

    const inputChunks = chunkParagraphs(body.text);

    const results = [];
    let redundantCount = 0;
    let noveltyScoreSum = 0;

    for (let i = 0; i < inputChunks.length; i++) {
      const inputText = inputChunks[i];
      const inputVec = tfidfVector(inputText, idf);

      const matches = corpusChunks
        .map((chunk) => ({
          sourceTitle: chunk.sourceTitle,
          similarity: cosineSimilarity(inputVec, chunk.vec),
          excerpt: excerpt(chunk.text),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, body.topK)
        .map((m) => ({
          sourceTitle: m.sourceTitle,
          similarity: Number(m.similarity.toFixed(4)),
          excerpt: m.excerpt,
        }));

      const maxSimilarity = matches.length > 0 ? matches[0].similarity : 0;
      const label = labelFromMaxSimilarity(maxSimilarity);

      if (label === "redundant") {
        redundantCount++;
      }

      noveltyScoreSum += 1 - maxSimilarity;

      results.push({
        chunkIndex: i,
        maxSimilarity: Number(maxSimilarity.toFixed(4)),
        label,
        matches,
      });
    }

    const totalChunks = inputChunks.length;
    const redundantPct =
      totalChunks === 0 ? 0 : Number((redundantCount / totalChunks).toFixed(4));
    const avgNoveltyScore =
      totalChunks === 0 ? 0 : Number((noveltyScoreSum / totalChunks).toFixed(4));

    return reply.send({
      summary: {
        totalChunks,
        redundantPct,
        avgNoveltyScore,
      },
      results,
    });
  });
}