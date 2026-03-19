import { tokenize } from "./tokenizer.js";
import type { SparseVec } from "./similarity.js";

export type IdfMap = Map<string, number>;

export function buildIdf(chunks: string[]): IdfMap {
  const df = new Map<string, number>();
  const totalDocs = chunks.length || 1;

  for (const chunk of chunks) {
    const uniqueTokens = new Set(tokenize(chunk));

    for (const token of uniqueTokens) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();

  for (const [token, freq] of df.entries()) {
    const value = Math.log((totalDocs + 1) / (freq + 1)) + 1;
    idf.set(token, value);
  }

  return idf;
}

export function tfidfVector(text: string, idf: IdfMap): SparseVec {
  const tokens = tokenize(text);
  if (tokens.length === 0) return new Map();

  const tf = new Map<string, number>();

  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }

  const vec: SparseVec = new Map();
  const totalTokens = tokens.length;

  for (const [token, count] of tf.entries()) {
    const tfNorm = count / totalTokens;
    const idfValue = idf.get(token) ?? 0;
    const weight = tfNorm * idfValue;

    if (weight > 0) {
      vec.set(token, weight);
    }
  }

  return vec;
}

export function idfToJson(idf: IdfMap): Record<string, number> {
  return Object.fromEntries(idf.entries());
}

export function idfFromJson(obj: Record<string, number>): IdfMap {
  return new Map(
    Object.entries(obj).map(([key, value]) => [key, Number(value)])
  );
}