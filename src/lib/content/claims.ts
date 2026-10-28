/**
 * Claim control. Flags wording that implies medical, guaranteed, certified or otherwise
 * unsubstantiated outcomes. Used to (a) require explicit confirmation before an admin publishes
 * flagged copy and (b) reject chatbot answers that introduce such claims.
 */

export interface ClaimFlag {
  id: string;
  label: string;
  match: string;
}

const rules: { id: string; label: string; pattern: RegExp }[] = [
  { id: "whitening", label: "Skin whitening / lightening of natural skin colour", pattern: /\b(whiten\w*|lighten\w*\s+(your\s+)?(natural\s+)?skin|fairness|fairer|skin\s+bleach\w*)\b/i },
  { id: "medical", label: "Treats or cures a medical condition", pattern: /\b(cure[sd]?|curing|heals?|treat(s|ment)?\s+(acne|eczema|melasma|psoriasis|rosacea|dermatitis|infection)|eliminat\w+\s+acne)\b/i },
  { id: "guarantee", label: "Guaranteed or permanent results", pattern: /\b(guarantee[ds]?|permanent(ly)?|100\s*%|instant(ly)?\s+(results?|remov\w*)|overnight\s+results?)\b/i },
  { id: "removal", label: "Removes wrinkles, pores, blackheads or tan", pattern: /\b(remov\w*|eras\w*|eliminat\w*|get\s+rid\s+of)\s+(all\s+)?(wrinkles?|pores?|blackheads?|tan|tanning|dark\s+spots?|pigmentation)\b/i },
  { id: "clinical", label: "Clinical or professional endorsement", pattern: /\b(clinically|dermatologist[-\s]?(approved|tested|recommended)|scientifically\s+proven|lab[-\s]?tested|proven\s+to)\b/i },
  { id: "safety", label: "Absolute safety or skin-compatibility claims", pattern: /\b(hypoallergenic|non[-\s]?comedogenic|100\s*%\s*safe|completely\s+safe|no\s+side\s+effects|safe\s+for\s+(all|every)(one|\s+skin))\b/i },
  { id: "free-from", label: "\"Free from\" claims", pattern: /\b(paraben|sulphate|sulfate|fragrance|alcohol|cruelty|chemical)[-\s]?free\b/i },
  { id: "origin", label: "Country of manufacture", pattern: /\b(made|manufactured|produced)\s+in\s+(korea|south\s+korea|india|japan|france)\b/i },
  { id: "concentration", label: "Specific ingredient concentration", pattern: /\b\d+(\.\d+)?\s*%/ },
  { id: "certification", label: "Certifications or awards", pattern: /\b(certified|award[-\s]?winning|organic\s+certified|fda[-\s]approved|ayush)\b/i },
];

export function findClaimFlags(text: string): ClaimFlag[] {
  const flags: ClaimFlag[] = [];
  for (const rule of rules) {
    const m = text.match(rule.pattern);
    if (m) flags.push({ id: rule.id, label: rule.label, match: m[0] });
  }
  return flags;
}

/** Flags present in `answer` whose matched wording does not appear in the trusted evidence. */
export function unsupportedClaimFlags(answer: string, evidence: string): ClaimFlag[] {
  const lowerEvidence = evidence.toLowerCase();
  return findClaimFlags(answer).filter((f) => !lowerEvidence.includes(f.match.toLowerCase()));
}
