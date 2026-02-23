import Fastify from "fastify";
import { pool } from "./db/pool.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true }));

  app.get("/db", async () => {
  const r = await pool.query("select 1 as ok");
  return r.rows[0];
});

  return app;
}