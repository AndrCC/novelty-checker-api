import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { chunkParagraphs } from "../core/chunker.js";

const CreateCorpusBody = z.object({
  name: z.string().min(1),
  documents: z.array(
    z.object({
      title: z.string().min(1),
      text: z.string().min(1),
    })
  ).min(1),
});

export async function corporaRoutes(app: FastifyInstance) {
  app.post("/corpora", async (req, reply) => {
    const body = CreateCorpusBody.parse(req.body);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const corpusResult = await client.query(
        `
        INSERT INTO corpus (name)
        VALUES ($1)
        RETURNING id, name, created_at
        `,
        [body.name]
      );

      const corpus = corpusResult.rows[0] as {
        id: string;
        name: string;
        created_at: string;
      };

      let totalDocs = 0;
      let totalChunks = 0;

      for (const doc of body.documents) {
        const docResult = await client.query(
          `
          INSERT INTO corpus_doc (corpus_id, title, raw_text)
          VALUES ($1, $2, $3)
          RETURNING id
          `,
          [corpus.id, doc.title, doc.text]
        );

        const docId = docResult.rows[0].id as string;
        totalDocs++;

        const chunks = chunkParagraphs(doc.text);

        for (let i = 0; i < chunks.length; i++) {
          await client.query(
            `
            INSERT INTO corpus_chunk (corpus_id, doc_id, chunk_index, text)
            VALUES ($1, $2, $3, $4)
            `,
            [corpus.id, docId, i, chunks[i]]
          );
          totalChunks++;
        }
      }

      await client.query("COMMIT");

      return reply.code(201).send({
        corpusId: corpus.id,
        name: corpus.name,
        stats: {
          totalDocs,
          totalChunks,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
}