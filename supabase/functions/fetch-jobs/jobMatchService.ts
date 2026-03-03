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
  skills: number;
  experience: number;
  tools: number;
  keywords: number;
}

export interface MatchResult {
  overallScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  partialMatches: string[];
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

function scoreSkills(
  resumeSkills: string[],
  jobSkills: string[],
  resumeText: string
): {
  matchedSkills: string[];
  missingSkills: string[];
  partialMatches: string[];
  skillsScore: number;
  toolsScore: number;
} {
  const normalizedResumeSkills = resumeSkills.map((s) => normalizeSkill(s));
  const resumeTextLower = resumeText.toLowerCase();

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  const partialMatches: string[] = [];

  let fullMatchCount = 0;
  let partialMatchCount = 0;

  let toolTotal = 0;
  let toolFullMatchCount = 0;
  let toolPartialMatchCount = 0;

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

    const isTool = TOOL_KEYWORDS.has(normalizedJobSkill);
    if (isTool) {
      toolTotal += 1;
    }

    if (hasExact) {
      matchedSkills.push(jobSkill);
      fullMatchCount += 1;
      if (isTool) toolFullMatchCount += 1;
    } else if (hasPartial) {
      partialMatches.push(jobSkill);
      partialMatchCount += 1;
      if (isTool) toolPartialMatchCount += 1;
    } else {
      missingSkills.push(jobSkill);
    }
  }

  const denominator = jobSkills.length || 1;
  const rawSkillsScore =
    ((fullMatchCount + partialMatchCount * 0.5) / denominator) * 100;

  let rawToolsScore = 0;
  if (toolTotal > 0) {
    rawToolsScore =
      ((toolFullMatchCount + toolPartialMatchCount * 0.5) / toolTotal) * 100;
  }

  return {
    matchedSkills,
    missingSkills,
    partialMatches,
    skillsScore: clampScore(rawSkillsScore),
    toolsScore: clampScore(rawToolsScore),
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

export class JobMatchService {
  static scoreJobAgainstResume(params: {
    resumeText: string;
    resumeSkills: string[];
    job: JobListing;
  }): MatchResult {
    const { resumeText, resumeSkills, job } = params;

    const {
      matchedSkills,
      missingSkills,
      partialMatches,
      skillsScore,
      toolsScore,
    } = scoreSkills(resumeSkills, job.required_skills, resumeText);

    const experienceScore = scoreExperience(resumeText, job.experience_level);
    const keywordsScore = scoreKeywords(resumeText, job.description);

    const sectionScores: MatchSectionScores = {
      skills: skillsScore,
      experience: experienceScore,
      tools: toolsScore,
      keywords: keywordsScore,
    };

    const overallScore = clampScore(
      skillsScore * 0.5 +
        experienceScore * 0.2 +
        toolsScore * 0.2 +
        keywordsScore * 0.1
    );

    return {
      overallScore,
      matchedSkills,
      missingSkills,
      partialMatches,
      sectionScores,
    };
  }
}

