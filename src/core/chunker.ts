export function chunkParagraphs (raw: string): string[] {
    const normalized = raw.replace(/\r\n/g, "\n").trim();
    if(!normalized) {
        return [];
    }

    return normalized
    .split(/\n\s*\n+/) 
    .map((s) => s.trim())
    .filter(Boolean);
}