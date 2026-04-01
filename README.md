# novelty-checker-api

A small Fastify + TypeScript API for novelty checking against a reference corpus. It stores documents in PostgreSQL, splits them into paragraph chunks, builds a TF-IDF index, and compares new text against the indexed corpus using cosine similarity.

## What It Does

- Creates corpora from one or more source documents
- Splits documents into paragraph-based chunks
- Builds a TF-IDF index for each corpus
- Checks new text against the indexed corpus
- Returns top matches plus a novelty label for each input chunk

## How It Works

The API follows a simple three-step flow:

1. Create a corpus by sending documents to `POST /corpora`
2. Build the corpus index with `POST /corpora/:id/index`
3. Check new text with `POST /corpora/:id/check`

Internally:

- Documents are split on blank lines, so each paragraph becomes a chunk
- Tokens are lowercased and punctuation is removed
- TF-IDF vectors are built from stored corpus chunks
- Cosine similarity is used to score each new chunk against corpus chunks
- Each chunk gets a novelty label based on its highest similarity score

### Label Thresholds

- `redundant`: score `>= 0.75`
- `needs_citation`: score between `0.35` and `0.75`
- `novel`: score `<= 0.35`

## Tech Stack

- Node.js
- TypeScript
- Fastify
- PostgreSQL
- Zod
- Vitest

## Project Structure

```text
src/
  app.ts
  server.ts
  core/
    chunker.ts
    labeler.ts
    similarity.ts
    tfidf.ts
    tokenizer.ts
  db/
    pool.ts
    migrations/
      001_init.sql
  routes/
    check.ts
    corpora.ts
    index.ts
test/
  check.int.test.ts
  chunker.test.ts
  similarity.test.ts
  tfidf.test.ts
  tokenizer.test.ts
```

## Requirements

- Node.js
- npm
- PostgreSQL

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgres://postgres:postgres@localhost:5432/novelty
```

Variables:

- `PORT`: HTTP server port
- `HOST`: HTTP bind address
- `DATABASE_URL`: PostgreSQL connection string

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

The repository includes a `docker-compose.yml` for local Postgres:

```bash
docker compose up -d
```

This starts PostgreSQL with:

- database: `novelty`
- user: `postgres`
- password: `postgres`

### 3. Apply the database migration

Run the SQL in `src/db/migrations/001_init.sql` against your local database. This project currently does not include a migration runner script, so this step is manual.

### 4. Start the API

```bash
npm run dev
```

By default, the API will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev`: starts the server in watch mode with `tsx`
- `npm run build`: compiles TypeScript to `dist/`
- `npm run start`: runs the compiled server
- `npm test`: runs the test suite once
- `npm run test:watch`: runs Vitest in watch mode

## API Endpoints

### `GET /health`

Basic health check.

Response:

```json
{
  "ok": true
}
```

### `GET /db`

Checks whether the database connection is working.

Response:

```json
{
  "ok": 1
}
```

### `POST /corpora`

Creates a corpus and stores its documents and paragraph chunks.

Request body:

```json
{
  "name": "my-corpus",
  "documents": [
    {
      "title": "review1",
      "text": "Primeiro paragrafo.\n\nSegundo paragrafo."
    },
    {
      "title": "wiki",
      "text": "Outro texto.\n\nMais um trecho."
    }
  ]
}
```

Response:

```json
{
  "corpusId": "uuid",
  "name": "my-corpus",
  "stats": {
    "totalDocs": 2,
    "totalChunks": 4
  }
}
```

### `POST /corpora/:id/index`

Builds or rebuilds the TF-IDF index for a corpus.

Response:

```json
{
  "corpusId": "uuid",
  "stats": {
    "totalChunks": 4,
    "vocabSize": 6
  }
}
```

If the corpus does not exist or has no chunks, the API returns:

```json
{
  "error": "corpus not found or empty"
}
```

### `POST /corpora/:id/check`

Checks new text against an indexed corpus.

Request body:

```json
{
  "text": "Primeiro paragrafo.\n\nUm trecho totalmente novo sobre astronomia.",
  "topK": 3
}
```

Response shape:

```json
{
  "summary": {
    "totalChunks": 2,
    "redundantPct": 0.5,
    "avgNoveltyScore": 0.42
  },
  "results": [
    {
      "chunkIndex": 0,
      "maxSimilarity": 1,
      "label": "redundant",
      "matches": [
        {
          "sourceTitle": "review1",
          "similarity": 1,
          "excerpt": "Primeiro paragrafo."
        }
      ]
    }
  ]
}
```

If the corpus has not been indexed yet, the API returns:

```json
{
  "error": "corpus not indexed; run /corpora/:id/index first"
}
```

## Example Workflow

### 1. Create a corpus

```bash
curl -X POST http://localhost:3000/corpora ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"demo\",\"documents\":[{\"title\":\"doc1\",\"text\":\"Primeiro paragrafo.\n\nSegundo paragrafo.\"}]}"
```

### 2. Index the corpus

```bash
curl -X POST http://localhost:3000/corpora/<corpus-id>/index
```

### 3. Check new text

```bash
curl -X POST http://localhost:3000/corpora/<corpus-id>/check ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"Primeiro paragrafo.\n\nTexto novo sobre astronomia.\",\"topK\":3}"
```

## Database Schema

The current schema contains four tables:

- `corpus`: top-level corpus metadata
- `corpus_doc`: raw documents stored under a corpus
- `corpus_chunk`: paragraph chunks generated from each document
- `corpus_index`: persisted TF-IDF index data for a corpus

The initial schema is defined in `src/db/migrations/001_init.sql`.

## Testing

Run the test suite with:

```bash
npm test
```

Coverage currently includes:

- paragraph chunking
- tokenization
- TF-IDF construction
- cosine similarity
- an integration test covering create -> index -> check

Note that tests rely on the environment variables loaded from `.env`, including `DATABASE_URL`.

## Current Limitations

- Database migrations are manual
- There is no authentication or authorization
- A corpus must be indexed explicitly before it can be checked
- Chunking is paragraph-based only
- Tokenization is intentionally simple
- There are no read/update/delete endpoints for corpora yet

## Future Improvements

- Add a migration runner
- Improve Unicode and accent handling in tokenization
- Add corpus listing and retrieval endpoints
- Add structured API documentation or OpenAPI
- Support alternate chunking strategies
