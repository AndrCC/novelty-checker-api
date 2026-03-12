export function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const cleaned = lower.replace(/[^a-z0-9à-ÿ\s]/gi, " ");
  
  return cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}