import type { FallbackIntent } from "@/lib/content/schemas";

/** Deterministic, keyword-based intent detection used for fallbacks and safety routing. */

const PATTERNS: [FallbackIntent, RegExp][] = [
  ["contact", /\b(contact|e-?mail|phone|call|number|instagram|insta|whats ?app|reach|support|customer care|helpline|talk to)\b/i],
  ["orders", /\b(order status|track(ing)?|my order|where is my|payment (failed|status)|paid|cancel(l?ed|lation)?|invoice)\b/i],
  ["price", /(₹|\brs\.?\b|\binr\b|\bprice|\bcost|\bhow much|\bmrp\b|\brate\b|\bexpensive|\bcheap|\bdiscount|\boffer\b)/i],
  ["returns", /\b(return|refund|exchange|replace(ment)?|damaged|wrong item)\b/i],
  ["shipping", /\b(ship(ping)?|deliver(y|ed)?|courier|dispatch|pin ?code|pincode|cod|cash on delivery|how long.*(arrive|take))\b/i],
  ["usage", /\b(how (do|should|can) i (use|apply)|how to (use|apply)|directions?|usage|apply|application|routine|morning|night|am\b|pm\b|how often|layer)\b/i],
  ["ingredients", /\b(ingredient|inci|contain|formula|vitamin|hyaluronic|niacinamide|nilacinamide|tocopherol|paraben|fragrance|sulph?ate|alcohol|actives?)\b/i],
  ["skinType", /\b(dry|sensitive|oily|combination|normal skin|skin ?type|suit(able)?|good for my skin|work for my skin)\b/i],
  ["product", /\b(kmg|korean magic glow|face cream|cream|product|about (the|this|amros|it)|tell me (more )?about|amros)\b/i],
];

const GREETING = /^(hi+|hello+|hey+|hiya|namaste|good (morning|afternoon|evening)|yo|hola|greetings)[\s!.,?✨🙂😊]*$/i;

/**
 * Meta / identity questions aimed at the assistant itself rather than at Amros Beauty products.
 * These always get the deterministic scope statement so the assistant never role-plays as a
 * human, a different brand, a doctor, a lawyer or an uncapped AI — regardless of what the
 * language model would otherwise say.
 */
const IDENTITY = [
  /\b(who|what)\s+(are|r|r')\s*(you|u|this|that)\b/i,
  /\b(are\s+you|r\s+u|r'\s+u)\s+(a\s+)?(human|real|person|bot|robot|ai|chatbot|chat ?bot|assistant|machine|gpt|chatgpt|claude|gemini|llm|language model)\b/i,
  /\b(what('?s|\s+is)|whats)\s+(your|ur)\s+(name|purpose|job|role|function|model)\b/i,
  /\b(who\s+(made|built|created|developed|trained|designed))\s+(you|u|this)\b/i,
  /\b(why\s+(are|r|r')\s*(you|u)\s+(here|exist(ing)?|around))\b/i,
  /\b(do\s+you|can\s+you)\s+(have|feel|think|love|dream|sleep|eat|work|live)\b/i,
  /\b(tell\s+me\s+about\s+)?(yourself|ur ?self)\b/i,
  /\bintroduce\s+(yourself|ur ?self)\b/i,
];

export function isIdentityQuestion(text: string): boolean {
  return IDENTITY.some((p) => p.test(text));
}

/** Symptoms, conditions and situations that require cautious, professional-referral handling. */
const MEDICAL =
  /\b(rash|burn(ing|s)?|sting(ing)?|itch(y|ing)?|swell(ing|ed)?|swollen|hives|blister|allerg(y|ic|ies)|reaction|irritat(ed|ion)|bleed(ing)?|infect(ed|ion)|eczema|psoriasis|rosacea|dermatitis|melasma|vitiligo|pregnan(t|cy)|breast ?feeding|nursing|prescription|medication|tretinoin|isotretinoin|accutane|steroid|doctor|diagnos\w*|disease|wound|open cut|sunburn)\b/i;

/** Attempts to override instructions or extract internal data. */
const INJECTION = [
  /\b(ignore|disregard|forget|override|bypass)\b.{0,40}\b(instruction|rule|prompt|guideline|previous|above|system)/i,
  /\b(system|developer|hidden|internal|initial)\s+(prompt|message|instruction)/i,
  /\b(reveal|show|print|repeat|leak|dump|output|tell me)\b.{0,40}\b(prompt|instruction|api[\s_-]?key|secret|token|password|env(ironment)?( var(iable)?s?)?|credential|config)/i,
  /\b(you are now|act as|pretend (to be|you are)|roleplay as|jailbreak|dan mode|developer mode|do anything now)\b/i,
  /\b(process\.env|nvidia_api_key|service[_\s]role|supabase|razorpay[_\s]key|admin (password|panel|record))\b/i,
  /<\/?(system|evidence|instructions?)>/i,
];

export function isGreeting(text: string): boolean {
  return GREETING.test(text.trim());
}

export function isMedicalQuestion(text: string): boolean {
  return MEDICAL.test(text);
}

export function isInjectionAttempt(text: string): boolean {
  return INJECTION.some((p) => p.test(text));
}

export function classifyIntent(text: string): FallbackIntent {
  const t = text.trim();
  if (!t) return "unknown";
  if (isInjectionAttempt(t)) return "refusal";
  if (isMedicalQuestion(t)) return "medical";
  // Identity questions are matched before the generic PATTERNS so that "who are you?" doesn't
  // get swallowed by the "about…" fragment of the product pattern.
  if (isIdentityQuestion(t)) return "identity";
  if (isGreeting(t)) return "greeting";
  for (const [intent, pattern] of PATTERNS) if (pattern.test(t)) return intent;
  return "unknown";
}
