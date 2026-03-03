export interface AtsScoringInput {
  baseScore: number; // Existing ATS score before quantified impact adjustments (0-100)
  keywordScore: number; // Existing keyword relevance score (0-100)
  resumeText: string;
}

export interface AtsScoringResult {
  atsScore: number;
  keywordScore: number;
  quantifiedImpactScore: number;
  finalScore: number;
}

// Scoring configuration (no magic numbers)
const MAX_SCORE = 100;
const MAX_QUANTIFIED_BONUS_PERCENT = 10; // Max +10% boost from quantified impact
const NO_METRICS_PENALTY_PERCENT = 3; // Small penalty when no metrics found
const GENERIC_PHRASE_PENALTY_PERCENT = 5; // Max penalty for generic soft-skill phrases
const MAX_QUANTIFIED_SIGNAL_COUNT = 12; // Saturation point for impact signals

const GENERIC_PHRASES = [
  "hardworking",
  "hard working",
  "team player",
  "good communication",
  "excellent communication",
  "strong communication",
  "self-motivated",
  "quick learner",
  "detail oriented",
  "results driven",
];

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(MAX_SCORE, Math.round(value)));
}

function countRegexMatches(regex: RegExp, text: string): number {
  let count = 0;
  let match: RegExpExecArray | null;
  const global = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
  // eslint-disable-next-line no-cond-assign
  while ((match = global.exec(text)) !== null) {
    count += 1;
  }
  return count;
}

/**
 * Detects quantified, measurable impact in resume text.
 * Returns a 0-100 score representing the strength of quantified achievements.
 */
export function detectQuantifiedImpact(text: string): number {
  const lower = text.toLowerCase();

  // Percentages: "30%", "45.5 %"
  const percentageRegex = /\b\d+(\.\d+)?\s*%/g;
  // Growth multipliers: "2x", "3.5x", "2 x"
  const growthRegex = /\b\d+(\.\d+)?\s*x\b/g;
  // Currency: "$100k", "₹5,00,000", "10000 USD", "25000 inr"
  const currencyRegex =
    /(?:[$₹]\s*\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s*(?:usd|inr|eur|gbp)\b)/gi;
  // Numeric achievements: "500+ users", "1000 requests", "200k rows"
  const numericAchievementRegex =
    /\b\d[\d,]*\s*\+?\s*(users?|customers?|clients?|requests?|transactions?|leads?|sessions?|visits?|rows?|records?|orders?|deployments?)\b/gi;

  // Impact phrases
  const impactPhrases = [
    "increased by",
    "reduced by",
    "improved by",
    "optimized",
    "boosted",
    "decreased",
  ];

  let signalCount = 0;
  signalCount += countRegexMatches(percentageRegex, lower);
  signalCount += countRegexMatches(growthRegex, lower);
  signalCount += countRegexMatches(currencyRegex, lower);
  signalCount += countRegexMatches(numericAchievementRegex, lower);

  for (const phrase of impactPhrases) {
    const regex = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");
    signalCount += countRegexMatches(regex, lower);
  }

  if (signalCount <= 0) return 0;

  const normalized = Math.min(1, signalCount / MAX_QUANTIFIED_SIGNAL_COUNT);
  return clampScore(normalized * MAX_SCORE);
}

function detectGenericPhrasePenalty(text: string): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const phrase of GENERIC_PHRASES) {
    const regex = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");
    hits += countRegexMatches(regex, lower);
  }
  if (hits === 0) return 0;

  const normalized = Math.min(1, hits / 5);
  return normalized * GENERIC_PHRASE_PENALTY_PERCENT;
}

export function computeAtsScore(input: AtsScoringInput): AtsScoringResult {
  const atsScore = clampScore(input.baseScore);
  const keywordScore = clampScore(input.keywordScore);

  const quantifiedImpactScore = detectQuantifiedImpact(input.resumeText);
  const hasMetrics = quantifiedImpactScore > 0;

  const bonusFromImpact =
    (quantifiedImpactScore / MAX_SCORE) * MAX_QUANTIFIED_BONUS_PERCENT;

  const noMetricsPenalty = hasMetrics ? 0 : NO_METRICS_PENALTY_PERCENT;
  const genericPhrasePenalty = detectGenericPhrasePenalty(input.resumeText);

  const adjusted =
    atsScore + bonusFromImpact - noMetricsPenalty - genericPhrasePenalty;

  const finalScore = clampScore(adjusted);

  return {
    atsScore,
    keywordScore,
    quantifiedImpactScore,
    finalScore,
  };
}

