import type { Chunk } from "./chunking";

/**
 * BM25 lexical retrieval. Complements semantic search for exact ingredient names, product names and
 * order-policy keywords, and keeps retrieval working when embeddings are unavailable.
 */

const STOPWORDS = new Set(
  "a an and are as at be but by can could do does for from had has have how i if in into is it its me my of on or our please so tell that the their them there this to us was we what when where which who why will with would you your about any".split(
    " ",
  ),
);

/** Domain synonyms mapped to a canonical token so customer phrasing matches the content. */
const SYNONYMS: Record<string, string> = {
  cost: "price",
  costs: "price",
  priced: "price",
  rupee: "price",
  rupees: "price",
  rs: "price",
  inr: "price",
  mrp: "price",
  rate: "price",
  much: "price",
  delivery: "shipping",
  deliver: "shipping",
  ship: "shipping",
  shipped: "shipping",
  courier: "shipping",
  dispatch: "shipping",
  refund: "return",
  refunds: "return",
  exchange: "return",
  returns: "return",
  phone: "contact",
  call: "contact",
  email: "contact",
  mail: "contact",
  instagram: "contact",
  whatsapp: "contact",
  reach: "contact",
  inci: "ingredient",
  contain: "ingredient",
  contains: "ingredient",
  formula: "ingredient",
  apply: "usage",
  use: "usage",
  using: "usage",
  directions: "usage",
  routine: "usage",
  hyaluronic: "hyaluronic",
  ha: "hyaluronic",
  vit: "vitamin",
  niacinamide: "niacinamide",
  nilacinamide: "niacinamide",
  b3: "niacinamide",
  tocopherol: "vitamin",
  kmg: "kmg",
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/₹/g, " price ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => {
      const base = t.length > 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t;
      return SYNONYMS[t] ?? SYNONYMS[base] ?? base;
    });
}

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
}

export class LexicalIndex {
  private readonly docs: { chunk: Chunk; tf: Map<string, number>; length: number }[];
  private readonly df = new Map<string, number>();
  private readonly avgLength: number;

  constructor(chunks: Chunk[], private readonly k1 = 1.4, private readonly b = 0.6) {
    this.docs = chunks.map((chunk) => {
      const tokens = tokenize(chunk.content);
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      return { chunk, tf, length: tokens.length };
    });
    this.avgLength = this.docs.reduce((s, d) => s + d.length, 0) / Math.max(1, this.docs.length);
  }

  search(query: string, limit = 6): ScoredChunk[] {
    const terms = [...new Set(tokenize(query))];
    if (terms.length === 0) return [];
    const n = this.docs.length;
    const results: ScoredChunk[] = [];
    for (const doc of this.docs) {
      let score = 0;
      for (const term of terms) {
        const f = doc.tf.get(term);
        if (!f) continue;
        const df = this.df.get(term) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        score += (idf * f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * doc.length) / this.avgLength));
      }
      if (score > 0) results.push({ chunk: doc.chunk, score });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
