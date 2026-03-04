export interface JobListing {
  provider: string;
  title: string;
  company: string;
  location: string;
  work_type: "remote" | "onsite" | "hybrid";
  experience_level: "entry" | "mid" | "senior" | "lead" | "executive";
  required_skills: string[];
  description: string;
  apply_url: string;
  source_tag: string;
}

export interface MatchSectionScores {
  required: number;
  preferred: number;
  keywords: number;
  experience: number;
}

export interface MatchResult {
  overallScore: number;
  requiredMatchScore: number;
  preferredMatchScore: number;
  keywordMatchScore: number;
  experienceScore: number;
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  matchedSkills: string[]; // aggregated (required + preferred) for backwards compatibility
  missingSkills: string[]; // aggregated (required + preferred) for backwards compatibility
  partialMatches: string[]; // aggregated partials across required + preferred
  sectionScores: MatchSectionScores;
}

const TOOL_KEYWORDS = new Set(
  [
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "terraform",
    "git",
    "github",
    "gitlab",
    "bitbucket",
    "jenkins",
    "circleci",
    "github actions",
    "ci/cd",
    "redis",
    "kafka",
    "datadog",
    "new relic",
    "sentry",
    "firebase",
    "figma",
  ].map((t) => t.toLowerCase())
);

const STOP_WORDS = new Set([
  "and",
  "or",
  "the",
  "with",
  "for",
  "to",
  "of",
  "in",
  "on",
  "a",
  "an",
  "as",
  "at",
  "by",
  "is",
  "are",
  "be",
  "from",
  "this",
  "that",
  "will",
  "you",
  "your",
  "we",
  "our",
  "they",
  "their",
  "job",
  "role",
  "responsibilities",
  "requirements",
  "experience",
  "skills",
  "engineer",
  "developer",
  "software",
  "senior",
  "junior",
  "mid",
]);

// Scoring weights (no magic numbers)
const REQUIRED_WEIGHT = 0.5;
const PREFERRED_WEIGHT = 0.15;
const KEYWORD_WEIGHT = 0.15;
const EXPERIENCE_WEIGHT = 0.2;

function normalizeSkill(raw: string): string {
  const s = raw.toLowerCase().trim();

  // Alias normalization
  if (["node", "nodejs", "node.js"].includes(s)) return "node.js";
  if (["js", "javascript"].includes(s)) return "javascript";
  if (["ts", "typescript"].includes(s)) return "typescript";
  if (["reactjs", "react.js"].includes(s)) return "react";

  return s;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/g)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreSkillGroup(
  resumeSkills: string[],
  jobSkills: string[],
  resumeText: string,
  missingPenalty: number
): {
  matched: string[];
  missing: string[];
  partial: string[];
  score: number;
} {
  const normalizedResumeSkills = resumeSkills.map((s) => normalizeSkill(s));
  const resumeTextLower = resumeText.toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];
  const partial: string[] = [];

  let fullMatchCount = 0;
  let partialMatchCount = 0;

  for (const jobSkill of jobSkills) {
    const normalizedJobSkill = normalizeSkill(jobSkill);

    const hasExact = normalizedResumeSkills.some(
      (rs) => rs === normalizedJobSkill
    );

    let hasPartial = false;
    if (!hasExact) {
      hasPartial =
        normalizedResumeSkills.some(
          (rs) =>
            rs.includes(normalizedJobSkill) || normalizedJobSkill.includes(rs)
        ) ||
        resumeTextLower.includes(normalizedJobSkill) ||
        normalizedJobSkill
          .split(/[\s/]+/)
          .some((part) => part.length > 2 && resumeTextLower.includes(part));
    }

    if (hasExact) {
      matched.push(jobSkill);
      fullMatchCount += 1;
    } else if (hasPartial) {
      partial.push(jobSkill);
      partialMatchCount += 1;
    } else {
      missing.push(jobSkill);
    }
  }

  const denominator = jobSkills.length || 1;
  const rawFraction =
    (fullMatchCount + partialMatchCount * 0.5 - missing.length * missingPenalty) /
    denominator;
  const rawScore = Math.max(0, Math.min(1, rawFraction)) * 100;

  return {
    matched,
    missing,
    partial,
    score: clampScore(rawScore),
  };
}

function scoreExperience(resumeText: string, level: JobListing["experience_level"]): number {
  const text = resumeText.toLowerCase();

  const levelWeights: Record<JobListing["experience_level"], number> = {
    entry: 1,
    mid: 2,
    senior: 3,
    lead: 4,
    executive: 5,
  };

  const desired = levelWeights[level];

  let years = 0;
  const yearRegex = /(\d+)\+?\s+years?/g;
  let match: RegExpExecArray | null;
  while ((match = yearRegex.exec(text))) {
    const value = parseInt(match[1], 10);
    if (!Number.isNaN(value)) {
      years = Math.max(years, value);
    }
  }

  let approxLevel = 1;
  if (years >= 10) approxLevel = 5;
  else if (years >= 7) approxLevel = 4;
  else if (years >= 4) approxLevel = 3;
  else if (years >= 2) approxLevel = 2;

  const senioritySignals: Record<JobListing["experience_level"], string[]> = {
    entry: ["junior", "entry level", "graduate", "fresher"],
    mid: ["engineer", "developer", "software engineer"],
    senior: ["senior", "sr."],
    lead: ["lead", "staff", "principal"],
    executive: ["director", "vp", "cto", "chief"],
  };

  let signalScoreBoost = 0;
  for (const [lvl, keywords] of Object.entries(senioritySignals) as [
    JobListing["experience_level"],
    string[]
  ][]) {
    if (keywords.some((k) => text.includes(k))) {
      const diff = Math.abs(levelWeights[lvl] - desired);
      signalScoreBoost = Math.max(signalScoreBoost, Math.max(0, 30 - diff * 10));
    }
  }

  const diff = Math.abs(approxLevel - desired);
  const baseScore = Math.max(0, 100 - diff * 25);

  return clampScore(baseScore + signalScoreBoost);
}

function scoreKeywords(resumeText: string, description: string): number {
  const resumeTokens = new Set(tokenize(resumeText));
  const descTokens = tokenize(description);

  if (descTokens.length === 0) return 0;

  let matches = 0;
  for (const token of descTokens) {
    if (resumeTokens.has(token)) matches += 1;
  }

  return clampScore((matches / descTokens.length) * 100);
}

/**
 * Extract minimum required years of experience from a job description.
 * Examples:
 * - "3+ years"
 * - "minimum 2 years"
 * - "at least 4 years"
 * - "2-4 years"
 * - "5 years of experience"
 * - "3 years React"
 * - "4+ years in Node.js"
 */
export function extractRequiredExperience(jobDescription: string): number | null {
  const text = jobDescription.toLowerCase();

  // Single pass regex for the common "X years" patterns, with optional range.
  const yearsPattern =
    /(?:minimum\s+|at\s+least\s+)?(\d+)\s*(?:[-–]\s*(\d+))?\s*\+?\s+years?/g;

  let match: RegExpExecArray | null;
  let best: number | null = null;

  // eslint-disable-next-line no-cond-assign
  while ((match = yearsPattern.exec(text)) !== null) {
    const minStr = match[1];
    const maxStr = match[2];

    const min = parseInt(minStr, 10);
    if (Number.isNaN(min)) continue;

    let candidate = min;
    if (maxStr) {
      const max = parseInt(maxStr, 10);
      if (!Number.isNaN(max)) {
        // For ranges like "2-4 years", we use the minimum requirement (2)
        candidate = Math.min(min, max);
      }
    }

    best = best === null ? candidate : Math.min(best, candidate);
  }

  return best;
}

/**
 * Extract total years of experience from resume text.
 * - Uses both explicit "X years" mentions and date ranges.
 * - Aggregates multiple ranges and converts months to years.
 * - Returns null when it cannot detect reasonable experience.
 */
export function extractResumeExperience(resumeText: string): number | null {
  const text = resumeText.toLowerCase();

  // 1) Explicit "X years" mentions
  const yearsMentionPattern =
    /\b(\d+)\s*\+?\s*(?:years?|yrs)\b(?:\s+of\s+experience)?/g;
  let explicitMaxYears = 0;
  let m: RegExpExecArray | null;

  // eslint-disable-next-line no-cond-assign
  while ((m = yearsMentionPattern.exec(text)) !== null) {
    const value = parseInt(m[1], 10);
    if (!Number.isNaN(value)) {
      explicitMaxYears = Math.max(explicitMaxYears, value);
    }
  }

  // 2) Date ranges (e.g., "Jan 2020 - Present", "2021 - 2024")
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1; // 1-12

  const monthMap: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

  function parseMonth(token: string | undefined): number | null {
    if (!token) return null;
    const key = token.toLowerCase();
    return monthMap[key] ?? null;
  }

  let totalMonths = 0;

  // Month + year ranges, e.g. "Jan 2020 - Mar 2023", "Feb 2020 – Present"
  const monthYearRangePattern =
    /\b([A-Za-z]{3,9})\s+(\d{4})\s*[–-]\s*(?:([A-Za-z]{3,9})\s+)?(\d{4}|present|current)\b/g;

  // eslint-disable-next-line no-cond-assign
  while ((m = monthYearRangePattern.exec(resumeText)) !== null) {
    const startMonthName = m[1];
    const startYearStr = m[2];
    const endMonthName = m[3];
    const endYearOrPresent = m[4];

    const startYear = parseInt(startYearStr, 10);
    if (Number.isNaN(startYear)) continue;
    const startMonth = parseMonth(startMonthName) ?? 1;

    let endYear: number;
    let endMonth: number;

    if (/present|current/i.test(endYearOrPresent)) {
      endYear = currentYear;
      endMonth = currentMonth;
    } else {
      endYear = parseInt(endYearOrPresent, 10);
      if (Number.isNaN(endYear)) continue;
      endMonth = parseMonth(endMonthName) ?? 12;
    }

    const months =
      (endYear - startYear) * 12 + (endMonth - startMonth + 1);
    if (months > 0) totalMonths += months;
  }

  // Year-only ranges, e.g. "2020 - 2023", "2018 – Present"
  const yearOnlyRangePattern =
    /\b(\d{4})\s*[–-]\s*(\d{4}|present|current)\b/g;

  // eslint-disable-next-line no-cond-assign
  while ((m = yearOnlyRangePattern.exec(resumeText)) !== null) {
    const startYearStr = m[1];
    const endYearOrPresent = m[2];

    const startYear = parseInt(startYearStr, 10);
    if (Number.isNaN(startYear)) continue;

    let endYear: number;
    if (/present|current/i.test(endYearOrPresent)) {
      endYear = currentYear;
    } else {
      endYear = parseInt(endYearOrPresent, 10);
      if (Number.isNaN(endYear)) continue;
    }

    const months = (endYear - startYear + 1) * 12;
    if (months > 0) totalMonths += months;
  }

  let yearsFromRanges = 0;
  if (totalMonths > 0) {
    yearsFromRanges = totalMonths / 12;
  }

  const combinedYears =
    yearsFromRanges > 0 && explicitMaxYears > 0
      ? Math.max(yearsFromRanges, explicitMaxYears)
      : yearsFromRanges > 0
      ? yearsFromRanges
      : explicitMaxYears;

  if (combinedYears <= 0) return null;

  // Round to one decimal place as a reasonable approximation
  const rounded = Math.round(combinedYears * 10) / 10;
  return rounded > 0 ? rounded : null;
}

/**
 * Compute an experience match score between required and actual years.
 * - required === null => neutral score (100)
 * - actual === null => moderate penalty (50)
 * - actual >= required => full score (100)
 * - actual between 80–99% of required => proportional scaling
 * - actual < 80% of required => stronger penalty
 */
export function calculateExperienceScore(
  required: number | null,
  actual: number | null
): number {
  if (required === null || required <= 0) {
    return 100;
  }

  if (actual === null || actual <= 0) {
    return 50;
  }

  const ratio = actual / required;

  if (ratio >= 1) {
    return 100;
  }

  const MIN_GOOD_RATIO = 0.8;

  if (ratio >= MIN_GOOD_RATIO) {
    // Smooth scaling between 80 and 100 when 80–100% of requirement is met
    return clampScore(ratio * 100);
  }

  // Stronger penalty when significantly below requirement
  const penalized = ratio * 80;
  return clampScore(penalized);
}

function parseJobSkillsFromDescription(
  description: string,
  fallbackRequired: string[]
): { requiredSkills: string[]; preferredSkills: string[] } {
  const lines = description.split(/\r?\n/).map((l) => l.trim());
  const required: string[] = [];
  const preferred: string[] = [];

  let current: "required" | "preferred" | null = null;

  const requiredHeading = /(required skills?|must[-\s]?have|mandatory)/i;
  const preferredHeading = /(preferred|nice to have)/i;

  for (const line of lines) {
    if (!line) {
      current = null;
      continue;
    }

    if (requiredHeading.test(line)) {
      current = "required";
      continue;
    }
    if (preferredHeading.test(line)) {
      current = "preferred";
      continue;
    }

    if (!current) continue;

    const parts = line
      .replace(/^[•\-*]+\s*/, "")
      .split(/[,;•]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 1);

    for (const part of parts) {
      if (current === "required") required.push(part);
      else preferred.push(part);
    }
  }

  const requiredSkills =
    required.length > 0 ? Array.from(new Set(required)) : fallbackRequired;
  const preferredSkills = Array.from(new Set(preferred));

  return { requiredSkills, preferredSkills };
}

export class JobMatchService {
  static scoreJobAgainstResume(params: {
    resumeText: string;
    resumeSkills: string[];
    job: JobListing;
  }): MatchResult {
    const { resumeText, resumeSkills, job } = params;

    const { requiredSkills, preferredSkills } = parseJobSkillsFromDescription(
      job.description,
      job.required_skills
    );

    const requiredGroup = scoreSkillGroup(
      resumeSkills,
      requiredSkills,
      resumeText,
      0.75
    );

    const preferredGroup = scoreSkillGroup(
      resumeSkills,
      preferredSkills,
      resumeText,
      0.25
    );

    const keywordScore = scoreKeywords(resumeText, job.description);

    const requiredYears = extractRequiredExperience(job.description);
    const actualYears = extractResumeExperience(resumeText);
    const experienceScore = calculateExperienceScore(requiredYears, actualYears);

    const requiredMatchScore = requiredGroup.score;
    const preferredMatchScore = preferredGroup.score;

    const sectionScores: MatchSectionScores = {
      required: requiredMatchScore,
      preferred: preferredMatchScore,
      keywords: keywordScore,
      experience: experienceScore,
    };

    const overallScore = clampScore(
      requiredMatchScore * REQUIRED_WEIGHT +
        preferredMatchScore * PREFERRED_WEIGHT +
        keywordScore * KEYWORD_WEIGHT +
        experienceScore * EXPERIENCE_WEIGHT
    );

    const matchedSkills = Array.from(
      new Set([...requiredGroup.matched, ...preferredGroup.matched])
    );
    const missingSkills = Array.from(
      new Set([...requiredGroup.missing, ...preferredGroup.missing])
    );
    const partialMatches = Array.from(
      new Set([...requiredGroup.partial, ...preferredGroup.partial])
    );

    return {
      overallScore,
      requiredMatchScore,
      preferredMatchScore,
      keywordMatchScore: keywordScore,
      experienceScore,
      matchedRequiredSkills: requiredGroup.matched,
      missingRequiredSkills: requiredGroup.missing,
      matchedPreferredSkills: preferredGroup.matched,
      missingPreferredSkills: preferredGroup.missing,
      matchedSkills,
      missingSkills,
      partialMatches,
      sectionScores,
    };
  }
}

