export type SparseVec = Map<string, number>;

export function cosineSimilarity(a: SparseVec, b: SparseVec): number {
  if (a.size === 0 || b.size === 0) return 0;

  let dot = 0;

  const [small, large] = a.size < b.size ? [a, b] : [b, a];

  for (const [key, valueA] of small) {
    const valueB = large.get(key);
    if (valueB !== undefined) {
      dot += valueA * valueB;
    }
  }

  let normA = 0;
  for (const value of a.values()) {
    normA += value * value;
  }

  let normB = 0;
  for (const value of b.values()) {
    normB += value * value;
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}