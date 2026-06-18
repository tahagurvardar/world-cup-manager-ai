// Board Expectations and Career Evaluation.
//
// When a manager picks a national team, the board sets a target based on team strength.
// At tournament end the achieved finish is compared with that target to produce an
// evaluation (Exceeded / Met / Below / Failed) that feeds reputation, board confidence,
// fan confidence and job security. This module is self-contained: it never mutates game
// state directly, it only computes plain objects + deltas that the controller applies.

const TOURNAMENT_YEAR = 2026;

// Ordered ladder of how deep a campaign reached. Higher index = deeper run.
// "final" means reaching the final (runner-up), "champion" is winning it.
const STAGE_LADDER = ["group", "roundOf32", "roundOf16", "quarterFinal", "semiFinal", "final", "champion"];

const TARGET_LABELS = {
  final: "Win the World Cup or reach the Final",
  semiFinal: "Reach the Semi-Finals",
  quarterFinal: "Reach the Quarter-Finals",
  roundOf16: "Reach the Round of 16",
  roundOf32: "Reach the Round of 32",
  group: "Be competitive in the Group Stage",
};

const PRESSURE_BY_TIER = ["Low", "Medium", "Medium", "High", "High", "Extreme"];
const IMPORTANCE_BY_TIER = ["Modest", "Standard", "Standard", "High", "High", "Critical"];
const FAN_EXPECTATION_BY_TIER = [
  "Proud just to compete",
  "Hoping to escape the group",
  "Knockout football demanded",
  "Quarter-finals expected",
  "Final four or disappointment",
  "Title or bust",
];

// Career-effect deltas applied once, at tournament end, per evaluation outcome.
const EVALUATION_EFFECTS = {
  "Exceeded Expectations": { reputation: 8, jobSecurity: 18, boardConfidence: 14, fanConfidence: 12 },
  "Met Expectations": { reputation: 3, jobSecurity: 8, boardConfidence: 6, fanConfidence: 5 },
  "Below Expectations": { reputation: -4, jobSecurity: -14, boardConfidence: -12, fanConfidence: -8 },
  "Failed Expectations": { reputation: -8, jobSecurity: -28, boardConfidence: -22, fanConfidence: -16 },
};

const EVALUATION_RANK = {
  "Failed Expectations": 0,
  "Below Expectations": 1,
  "Met Expectations": 2,
  "Exceeded Expectations": 3,
};

export const DEFAULT_JOB_SECURITY = 70;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lowerFirst(text) {
  if (!text) return "";
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// Maps a team overall rating to a target tier (0..5) on the stage ladder.
function targetTierFromOverall(overall = 0) {
  if (overall >= 86) return 5; // Win the World Cup / reach the Final
  if (overall >= 83) return 4; // Reach the Semi-Finals
  if (overall >= 80) return 3; // Reach the Quarter-Finals
  if (overall >= 77) return 2; // Reach the Round of 16
  if (overall >= 74) return 1; // Reach the Round of 32
  return 0; // Competitive group stage
}

export function getJobSecurityStatus(value = DEFAULT_JOB_SECURITY) {
  const score = clamp(Number(value) || 0, 0, 100);
  if (score >= 75) return "Secure";
  if (score >= 50) return "Stable";
  if (score >= 25) return "Under Pressure";
  return "At Risk";
}

export function normalizeJobSecurity(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return DEFAULT_JOB_SECURITY;
  return clamp(Math.round(Number(value)), 0, 100);
}

// Builds a fresh board expectation for the given team. evaluationStatus starts "Pending".
export function generateBoardExpectations(team) {
  if (!team) return null;

  const tier = targetTierFromOverall(team.overall);
  const targetStage = STAGE_LADDER[tier];

  return {
    teamCode: team.code,
    teamName: team.name,
    targetStage,
    targetTier: tier,
    targetLabel: TARGET_LABELS[targetStage] || TARGET_LABELS.group,
    pressureLevel: PRESSURE_BY_TIER[tier] || "Medium",
    importance: IMPORTANCE_BY_TIER[tier] || "Standard",
    boardConfidence: clamp(Math.round(team.overall), 50, 90),
    fanExpectation: FAN_EXPECTATION_BY_TIER[tier] || "Hoping for a strong run",
    evaluationStatus: "Pending",
    generatedAt: new Date().toISOString(),
  };
}

// Safe defaults for old saves: returns a normalized expectation or null when none exists.
export function normalizeBoardExpectations(expectations) {
  if (!expectations || typeof expectations !== "object") return null;

  const tier = STAGE_LADDER.includes(expectations.targetStage)
    ? STAGE_LADDER.indexOf(expectations.targetStage)
    : clamp(Number(expectations.targetTier) || 0, 0, 5);
  const targetStage = expectations.targetStage || STAGE_LADDER[tier];

  return {
    teamCode: expectations.teamCode || null,
    teamName: expectations.teamName || null,
    targetStage,
    targetTier: tier,
    targetLabel: expectations.targetLabel || TARGET_LABELS[targetStage] || TARGET_LABELS.group,
    pressureLevel: expectations.pressureLevel || PRESSURE_BY_TIER[tier] || "Medium",
    importance: expectations.importance || IMPORTANCE_BY_TIER[tier] || "Standard",
    boardConfidence: clamp(Math.round(Number(expectations.boardConfidence) || 65), 0, 100),
    fanExpectation: expectations.fanExpectation || FAN_EXPECTATION_BY_TIER[tier] || "Hoping for a strong run",
    evaluationStatus: expectations.evaluationStatus || "Pending",
    generatedAt: expectations.generatedAt || null,
  };
}

// Translates the manager team's final finish string into a ladder position + phrasing.
function finishToLadder(finish) {
  const value = String(finish || "").toLowerCase();

  if (value.includes("champion")) return { tier: 6, stage: "champion", label: "Won the World Cup", phrase: "winning the World Cup" };
  if (value.includes("runner")) return { tier: 5, stage: "final", label: "Reached the Final", phrase: "reaching the Final" };
  if (value.includes("third place")) return { tier: 4, stage: "semiFinal", label: "Finished third", phrase: "finishing third" };
  if (value.includes("fourth place")) return { tier: 4, stage: "semiFinal", label: "Finished fourth", phrase: "finishing fourth" };
  if (value.includes("semi")) return { tier: 4, stage: "semiFinal", label: "Reached the Semi-Finals", phrase: "reaching the Semi-Finals" };
  if (value.includes("quarter")) return { tier: 3, stage: "quarterFinal", label: "Reached the Quarter-Finals", phrase: "reaching the Quarter-Finals" };
  if (value.includes("round of 16")) return { tier: 2, stage: "roundOf16", label: "Reached the Round of 16", phrase: "reaching the Round of 16" };
  if (value.includes("round of 32")) return { tier: 1, stage: "roundOf32", label: "Reached the Round of 32", phrase: "reaching the Round of 32" };
  return { tier: 0, stage: "group", label: "Eliminated in the Group Stage", phrase: "a group-stage exit" };
}

function classifyOutcome(targetTier, achievedTier) {
  const diff = achievedTier - targetTier;
  if (diff >= 1) return "Exceeded Expectations";
  if (diff === 0) return "Met Expectations";
  if (diff === -1) return "Below Expectations";
  return "Failed Expectations";
}

function isBetterEvaluation(candidate, current) {
  if (!candidate) return false;
  if (!current) return true;
  const candidateRank = EVALUATION_RANK[candidate.status] ?? -1;
  const currentRank = EVALUATION_RANK[current.status] ?? -1;
  if (candidateRank !== currentRank) return candidateRank > currentRank;
  return (candidate.achievedTier || 0) > (current.achievedTier || 0);
}

// Evaluates a completed tournament against the active board target.
// Returns the filled-in expectation, the evaluation record, the deltas to apply
// (reputation / job security / board + fan confidence), and updated best/history.
export function evaluateBoardExpectations({
  expectations,
  finish,
  selectedTeam,
  jobSecurity = DEFAULT_JOB_SECURITY,
  bestEvaluation = null,
  history = [],
  evaluatedAt = new Date().toISOString(),
}) {
  const baseExpectations = normalizeBoardExpectations(expectations) || generateBoardExpectations(selectedTeam);
  const achieved = finishToLadder(finish);
  const status = classifyOutcome(baseExpectations.targetTier, achieved.tier);
  const effects = EVALUATION_EFFECTS[status] || EVALUATION_EFFECTS["Met Expectations"];

  const startingSecurity = normalizeJobSecurity(jobSecurity);
  const nextJobSecurity = clamp(startingSecurity + effects.jobSecurity, 0, 100);
  const nextBoardConfidence = clamp(baseExpectations.boardConfidence + effects.boardConfidence, 0, 100);

  const evaluation = {
    status,
    targetStage: baseExpectations.targetStage,
    targetLabel: baseExpectations.targetLabel,
    targetTier: baseExpectations.targetTier,
    achievedStage: achieved.stage,
    achievedTier: achieved.tier,
    achievedLabel: achieved.label,
    achievedPhrase: achieved.phrase,
    finish: finish || null,
    teamCode: selectedTeam?.code || baseExpectations.teamCode || null,
    teamName: selectedTeam?.name || baseExpectations.teamName || null,
    year: TOURNAMENT_YEAR,
    reputationChange: effects.reputation,
    jobSecurityChange: nextJobSecurity - startingSecurity,
    boardConfidenceChange: nextBoardConfidence - baseExpectations.boardConfidence,
    fanConfidenceChange: effects.fanConfidence,
    jobSecurity: nextJobSecurity,
    jobSecurityStatus: getJobSecurityStatus(nextJobSecurity),
    evaluatedAt,
  };

  const updatedExpectations = {
    ...baseExpectations,
    boardConfidence: nextBoardConfidence,
    evaluationStatus: status,
  };

  const safeHistory = Array.isArray(history) ? history : [];
  const normalizedBest = bestEvaluation && typeof bestEvaluation === "object" ? bestEvaluation : null;

  return {
    evaluation,
    expectations: updatedExpectations,
    jobSecurity: nextJobSecurity,
    reputationChange: effects.reputation,
    fanConfidenceChange: effects.fanConfidence,
    bestEvaluation: isBetterEvaluation(evaluation, normalizedBest) ? evaluation : normalizedBest,
    history: [...safeHistory, evaluation],
  };
}

// Headline announcing the board's target when a manager takes the job.
function announcementHeadline(team, expectations) {
  switch (expectations.targetStage) {
    case "final":
      return `${team.name} board demands World Cup glory.`;
    case "semiFinal":
      return `${team.name} board expects a semi-final run.`;
    case "quarterFinal":
      return `${team.name} board expects a quarter-final run.`;
    case "roundOf16":
      return `${team.name} board wants a place in the Round of 16.`;
    case "roundOf32":
      return `${team.name} board targets a Round of 32 berth.`;
    default:
      return `${team.name} board wants a competitive group-stage campaign.`;
  }
}

export function buildExpectationAnnouncementNews(team, expectations, createdAt = new Date().toISOString()) {
  if (!team || !expectations) return null;

  return {
    id: `board-expectation-${team.code}-${Date.now()}`,
    type: "board-expectation",
    headline: announcementHeadline(team, expectations),
    summary: `The ${team.name} board has set the target: ${expectations.targetLabel}. Pressure level: ${expectations.pressureLevel}. Board confidence sits at ${expectations.boardConfidence}%.`,
    teams: [{ code: team.code, name: team.name, flag: team.flag || null }],
    createdAt,
  };
}

const EVALUATION_VERB = {
  "Exceeded Expectations": "exceeded expectations",
  "Met Expectations": "met expectations",
  "Below Expectations": "fell below expectations",
  "Failed Expectations": "failed to meet expectations",
};

export function buildEvaluationNews(team, evaluation, createdAt = new Date().toISOString()) {
  if (!team || !evaluation) return null;

  const verb = EVALUATION_VERB[evaluation.status] || "were evaluated by the board";
  const securityNote =
    evaluation.jobSecurityChange >= 0
      ? `Job security strengthened to ${evaluation.jobSecurity}% (${evaluation.jobSecurityStatus}).`
      : `Job security slipped to ${evaluation.jobSecurity}% (${evaluation.jobSecurityStatus}).`;

  return {
    id: `board-evaluation-${team.code}-${Date.now()}`,
    type: "board-evaluation",
    headline: `${team.name} ${verb} after ${evaluation.achievedPhrase}.`,
    summary: `Board target was to ${lowerFirst(evaluation.targetLabel)}. Verdict: ${evaluation.status}. ${securityNote}`,
    teams: [{ code: team.code, name: team.name, flag: team.flag || null }],
    createdAt,
  };
}

// Card-ready view that merges the stored expectation with live tournament context.
export function buildBoardExpectationView(expectations, { currentStage, jobSecurity, lastEvaluation } = {}) {
  const normalized = normalizeBoardExpectations(expectations);
  if (!normalized) return null;

  const security = normalizeJobSecurity(jobSecurity);

  return {
    ...normalized,
    currentStage: currentStage || "Awaiting kickoff",
    jobSecurity: security,
    jobSecurityStatus: getJobSecurityStatus(security),
    lastEvaluationStatus: lastEvaluation?.status || null,
  };
}
