import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { buildIdf, idfToJson } from "../core/tfidf.js";

export async function indexRoutes(app: FastifyInstance) {
  app.post("/corpora/:id/index", async (req, reply) => {
    const { id } = req.params as { id: string };

    const chunksResult = await pool.query(
      `
      select text
      from corpus_chunk
      where corpus_id = $1
      order by doc_id, chunk_index
      `,
      [id]
    );

    const chunks = chunksResult.rows.map((row) => row.text as string);

    if (chunks.length === 0) {
      return reply.code(404).send({
        error: "corpus not found or empty"
      });
    }

    const idf = buildIdf(chunks);
    const idfJson = idfToJson(idf);
    const vocab = Object.keys(idfJson);

    await pool.query(
      `
      insert into corpus_index (corpus_id, idf, vocab)
      values ($1, $2::jsonb, $3::jsonb)
      on conflict (corpus_id)
      do update set
        idf = excluded.idf,
        vocab = excluded.vocab,
        created_at = now()
      `,
      [id, JSON.stringify(idfJson), JSON.stringify(vocab)]
    );

    return reply.send({
      corpusId: id,
      stats: {
        totalChunks: chunks.length,
        vocabSize: vocab.length
      }
    });
  });
}