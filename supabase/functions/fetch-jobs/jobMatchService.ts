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
}

export interface MatchResult {
  overallScore: number;
  requiredMatchScore: number;
  preferredMatchScore: number;
  keywordMatchScore: number;
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

    const requiredMatchScore = requiredGroup.score;
    const preferredMatchScore = preferredGroup.score;

    const sectionScores: MatchSectionScores = {
      required: requiredMatchScore,
      preferred: preferredMatchScore,
      keywords: keywordScore,
    };

    const overallScore = clampScore(
      requiredMatchScore * 0.6 +
        preferredMatchScore * 0.2 +
        keywordScore * 0.2
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

