export const DEFAULT_MANAGER_CAREER = {
  gamesManaged: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  winRate: 0,
  bestTournamentFinish: "Not started",
  currentTournamentFinish: "Not started",
  tournamentsPlayed: 0,
  trophiesWon: 0,
  reputation: 0,
  reputationTitle: "Unknown Coach",
  pressConferencesHeld: 0,
  positiveMediaReactions: 0,
  negativeMediaReactions: 0,
};

const finishRankings = [
  { rank: 1, tests: ["world cup champions", "champion"] },
  { rank: 2, tests: ["world cup runners-up", "runner-up", "runners-up"] },
  { rank: 3, tests: ["third place"] },
  { rank: 4, tests: ["fourth place"] },
  { rank: 8, tests: ["semi final", "semifinal"] },
  { rank: 16, tests: ["quarter final", "quarterfinal"] },
  { rank: 32, tests: ["round of 16"] },
  { rank: 48, tests: ["round of 32"] },
  { rank: 64, tests: ["group stage", "group"] },
];

const knockoutRoundKeys = ["roundOf32", "roundOf16", "quarterFinal", "semiFinal", "thirdPlace", "final"];

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateWinRate(wins, gamesManaged) {
  return gamesManaged ? Math.round((wins / gamesManaged) * 100) : 0;
}

export function getReputationTitle(reputation = 0) {
  if (reputation >= 85) return "World Legend";
  if (reputation >= 60) return "National Hero";
  if (reputation >= 30) return "Promising Coach";
  return "Unknown Coach";
}

function getFinishRank(finish) {
  const value = String(finish || "").toLowerCase();
  const match = finishRankings.find((item) => item.tests.some((test) => value.includes(test)));
  return match?.rank || 999;
}

function isBetterFinish(currentFinish, nextFinish) {
  if (!nextFinish || nextFinish === "Not started") return false;
  if (!currentFinish || currentFinish === "Not started") return true;
  return getFinishRank(nextFinish) < getFinishRank(currentFinish);
}

function getTeamGoals(match, teamCode) {
  if (!match || !teamCode) return null;
  const isHome = match.teams?.home?.code === teamCode;
  const isAway = match.teams?.away?.code === teamCode;

  if (!isHome && !isAway) return null;

  return {
    for: isHome ? match.score.home : match.score.away,
    against: isHome ? match.score.away : match.score.home,
  };
}

function getManagerOutcome(match, teamCode) {
  const goals = getTeamGoals(match, teamCode);
  if (!goals) return null;

  if (match.knockout?.winnerTeam?.code) {
    return match.knockout.winnerTeam.code === teamCode ? "win" : "loss";
  }

  if (goals.for > goals.against) return "win";
  if (goals.for < goals.against) return "loss";
  return "draw";
}

function toHistoryAward(award) {
  if (!award) return null;

  return {
    playerId: award.playerId,
    name: award.name,
    teamCode: award.teamCode,
    teamName: award.teamName,
    position: award.position,
    age: award.age,
    value: award.value,
    detail: award.detail,
    goals: award.goals,
    assists: award.assists,
    cleanSheets: award.cleanSheets,
    averageRating: award.averageRating,
  };
}

function getWinnerFlag(match) {
  if (!match) return null;
  if (match.knockout?.winnerTeam?.flag) return match.knockout.winnerTeam.flag;
  if (match.winnerTeamCode === match.homeTeamCode) return match.homeFlag;
  if (match.winnerTeamCode === match.awayTeamCode) return match.awayFlag;
  return null;
}

function getLoserFlag(match) {
  if (!match) return null;
  if (match.knockout?.loserTeam?.flag) return match.knockout.loserTeam.flag;
  if (match.loserTeamCode === match.homeTeamCode) return match.homeFlag;
  if (match.loserTeamCode === match.awayTeamCode) return match.awayFlag;
  return null;
}

function getSelectedGroupRow(tournament, teamCode) {
  if (!teamCode) return null;
  const groups = tournament?.groupStage?.table || [];
  for (const group of groups) {
    const row = group.rows?.find((item) => item.teamCode === teamCode);
    if (row) return row;
  }
  return null;
}

function flattenKnockoutMatches(tournament) {
  const knockout = tournament?.knockout || {};
  return knockoutRoundKeys.flatMap((round) => knockout[round] || []);
}

function matchIncludesTeam(match, teamCode) {
  return match?.homeTeamCode === teamCode || match?.awayTeamCode === teamCode;
}

function getKnockoutGoals(match, teamCode) {
  if (!match?.score || !matchIncludesTeam(match, teamCode)) return null;
  const isHome = match.homeTeamCode === teamCode;
  return {
    for: isHome ? match.score.home : match.score.away,
    against: isHome ? match.score.away : match.score.home,
  };
}

function getKnockoutOutcome(match, teamCode, goals) {
  if (match?.winnerTeamCode) return match.winnerTeamCode === teamCode ? "win" : "loss";
  if (match?.knockout?.winnerTeam?.code) return match.knockout.winnerTeam.code === teamCode ? "win" : "loss";
  if (goals.for > goals.against) return "win";
  if (goals.for < goals.against) return "loss";
  return "draw";
}

export function buildCampaignStats(tournament, teamCode) {
  const stats = {
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };

  const groupRow = getSelectedGroupRow(tournament, teamCode);
  if (groupRow) {
    stats.matchesPlayed += toNumber(groupRow.played);
    stats.wins += toNumber(groupRow.wins);
    stats.draws += toNumber(groupRow.draws);
    stats.losses += toNumber(groupRow.losses);
    stats.goalsFor += toNumber(groupRow.goalsFor);
    stats.goalsAgainst += toNumber(groupRow.goalsAgainst);
  }

  flattenKnockoutMatches(tournament)
    .filter((match) => match.status === "played" && matchIncludesTeam(match, teamCode))
    .forEach((match) => {
      const goals = getKnockoutGoals(match, teamCode);
      if (!goals) return;

      const outcome = getKnockoutOutcome(match, teamCode, goals);
      stats.matchesPlayed += 1;
      stats.goalsFor += goals.for;
      stats.goalsAgainst += goals.against;
      if (outcome === "win") stats.wins += 1;
      if (outcome === "draw") stats.draws += 1;
      if (outcome === "loss") stats.losses += 1;
    });

  return stats;
}

export function normalizeAchievements(achievements = []) {
  if (!Array.isArray(achievements)) return [];
  return achievements
    .filter((achievement) => achievement && achievement.title)
    .map((achievement) => ({
      id: achievement.id || achievement.key || `${achievement.title}-${achievement.year || 2026}`,
      key: achievement.key || achievement.id || achievement.title.toLowerCase().replace(/\s+/g, "-"),
      title: achievement.title,
      description: achievement.description || "",
      year: achievement.year || 2026,
      type: achievement.type || "career",
      teamCode: achievement.teamCode || null,
      teamName: achievement.teamName || null,
      player: achievement.player || null,
      value: achievement.value || null,
      unlockedAt: achievement.unlockedAt || new Date().toISOString(),
    }));
}

function makeAchievement(type, title, description, selectedTeam, unlockedAt, extra = {}) {
  const year = extra.year || 2026;
  const key = `${type}-${year}-${selectedTeam?.code || "manager"}`;

  return {
    id: key,
    key,
    type,
    title,
    description,
    year,
    teamCode: selectedTeam?.code || null,
    teamName: selectedTeam?.name || null,
    player: extra.player || null,
    value: extra.value || null,
    unlockedAt,
  };
}

function selectedTeamReachedSemiFinal(finish) {
  const value = String(finish || "").toLowerCase();
  return (
    value.includes("champion") ||
    value.includes("runner") ||
    value.includes("third place") ||
    value.includes("fourth place") ||
    value.includes("semi final") ||
    value.includes("semifinal")
  );
}

function reputationGainForFinish(finish) {
  const value = String(finish || "").toLowerCase();
  if (value.includes("champion")) return 35;
  if (value.includes("runner")) return 24;
  if (value.includes("third place") || value.includes("fourth place")) return 18;
  if (value.includes("semi final") || value.includes("semifinal")) return 14;
  if (value.includes("quarter")) return 10;
  if (value.includes("round of 16")) return 6;
  if (value.includes("round of 32")) return 4;
  return 2;
}

function bonusReputationForAchievements(achievements) {
  return achievements.reduce((total, achievement) => {
    if (achievement.type === "undefeated-tournament") return total + 6;
    if (achievement.type === "perfect-group-stage") return total + 4;
    if (achievement.type === "golden-boot-winner" || achievement.type === "golden-glove-winner") return total + 3;
    return total;
  }, 0);
}

export function buildTournamentAchievements({ tournament, selectedTeam, awards, unlockedAt = new Date().toISOString() }) {
  if (!selectedTeam || !tournament?.tournamentComplete) return [];

  const selectedTeamFinish = getSelectedTeamFinish(tournament, selectedTeam.code);
  const individual = awards?.individual || {};
  const groupRow = getSelectedGroupRow(tournament, selectedTeam.code);
  const campaignStats = buildCampaignStats(tournament, selectedTeam.code);
  const achievements = [];

  if (selectedTeamFinish === "World Cup Champions") {
    achievements.push(
      makeAchievement(
        "world-cup-champion",
        "World Cup Champion 2026",
        `${selectedTeam.name} lifted the World Cup under your management.`,
        selectedTeam,
        unlockedAt,
      ),
    );
  }

  if (selectedTeamFinish === "World Cup Champions" || selectedTeamFinish === "World Cup Runners-up") {
    achievements.push(
      makeAchievement(
        "reached-final",
        "Reached Final 2026",
        `${selectedTeam.name} reached the World Cup Final.`,
        selectedTeam,
        unlockedAt,
      ),
    );
  }

  if (selectedTeamReachedSemiFinal(selectedTeamFinish)) {
    achievements.push(
      makeAchievement(
        "reached-semi-final",
        "Reached Semi Final 2026",
        `${selectedTeam.name} made the final four of the tournament.`,
        selectedTeam,
        unlockedAt,
      ),
    );
  }

  if (individual.goldenBoot?.teamCode === selectedTeam.code) {
    achievements.push(
      makeAchievement(
        "golden-boot-winner",
        "Golden Boot Winner Managed",
        `${individual.goldenBoot.name} won the Golden Boot for ${selectedTeam.name}.`,
        selectedTeam,
        unlockedAt,
        { player: individual.goldenBoot.name, value: individual.goldenBoot.value },
      ),
    );
  }

  if (individual.goldenGlove?.teamCode === selectedTeam.code) {
    achievements.push(
      makeAchievement(
        "golden-glove-winner",
        "Golden Glove Winner Managed",
        `${individual.goldenGlove.name} won the Golden Glove for ${selectedTeam.name}.`,
        selectedTeam,
        unlockedAt,
        { player: individual.goldenGlove.name, value: individual.goldenGlove.value },
      ),
    );
  }

  if (groupRow?.played >= 3 && groupRow.wins === groupRow.played) {
    achievements.push(
      makeAchievement(
        "perfect-group-stage",
        "Perfect Group Stage",
        `${selectedTeam.name} won every group-stage match.`,
        selectedTeam,
        unlockedAt,
      ),
    );
  }

  if (campaignStats.matchesPlayed > 0 && campaignStats.losses === 0) {
    achievements.push(
      makeAchievement(
        "undefeated-tournament",
        "Undefeated Tournament",
        `${selectedTeam.name} completed the tournament without losing a match.`,
        selectedTeam,
        unlockedAt,
      ),
    );
  }

  return achievements;
}

function mergeAchievements(existingAchievements, nextAchievements) {
  const existing = normalizeAchievements(existingAchievements);
  const byKey = new Map(existing.map((achievement) => [achievement.key, achievement]));
  const unlocked = [];

  nextAchievements.forEach((achievement) => {
    if (byKey.has(achievement.key)) return;
    byKey.set(achievement.key, achievement);
    unlocked.push(achievement);
  });

  return {
    achievements: [...byKey.values()],
    unlocked,
  };
}

export function normalizeManagerCareer(career = {}) {
  const gamesManaged = toNumber(career.gamesManaged);
  const wins = toNumber(career.wins);
  const draws = toNumber(career.draws);
  const losses = toNumber(career.losses);
  const reputation = clamp(toNumber(career.reputation), 0, 100);

  return {
    ...DEFAULT_MANAGER_CAREER,
    ...career,
    gamesManaged,
    wins,
    draws,
    losses,
    goalsFor: toNumber(career.goalsFor),
    goalsAgainst: toNumber(career.goalsAgainst),
    winRate: calculateWinRate(wins, gamesManaged),
    bestTournamentFinish: career.bestTournamentFinish || DEFAULT_MANAGER_CAREER.bestTournamentFinish,
    currentTournamentFinish: career.currentTournamentFinish || DEFAULT_MANAGER_CAREER.currentTournamentFinish,
    tournamentsPlayed: toNumber(career.tournamentsPlayed),
    trophiesWon: toNumber(career.trophiesWon),
    reputation,
    reputationTitle: getReputationTitle(reputation),
    pressConferencesHeld: toNumber(career.pressConferencesHeld),
    positiveMediaReactions: toNumber(career.positiveMediaReactions),
    negativeMediaReactions: toNumber(career.negativeMediaReactions),
  };
}

export function normalizeTournamentHistory(history = []) {
  return Array.isArray(history) ? history : [];
}

export function getSelectedTeamFinish(tournament, selectedTeamCode) {
  if (!selectedTeamCode) return "No team selected";

  const status = tournament?.selectedTeamStatus?.qualificationStatus;
  if (status) return status;

  if (!tournament?.groupStageComplete) return "Group stage in progress";
  if (tournament?.tournamentComplete) return "Tournament complete";
  return "Tournament in progress";
}

export function applyManagerMatchResult(career, match, selectedTeamCode) {
  const goals = getTeamGoals(match, selectedTeamCode);
  const outcome = getManagerOutcome(match, selectedTeamCode);

  if (!goals || !outcome) {
    return normalizeManagerCareer(career);
  }

  const nextCareer = normalizeManagerCareer(career);
  nextCareer.gamesManaged += 1;
  nextCareer.goalsFor += goals.for;
  nextCareer.goalsAgainst += goals.against;

  if (outcome === "win") nextCareer.wins += 1;
  if (outcome === "draw") nextCareer.draws += 1;
  if (outcome === "loss") nextCareer.losses += 1;

  nextCareer.winRate = calculateWinRate(nextCareer.wins, nextCareer.gamesManaged);
  return nextCareer;
}

export function updateCurrentTournamentFinish(career, tournament, selectedTeamCode) {
  const nextCareer = normalizeManagerCareer(career);
  nextCareer.currentTournamentFinish = getSelectedTeamFinish(tournament, selectedTeamCode);
  return nextCareer;
}

export function buildTournamentHistoryRecord({ tournament, selectedTeam, awards, completedAt = new Date() }) {
  const podium = awards?.podium || {};
  const individual = awards?.individual || {};
  const selectedTeamFinish = getSelectedTeamFinish(tournament, selectedTeam?.code);
  const finalMatch = tournament?.knockout?.final?.[0];
  const thirdPlaceMatch = tournament?.knockout?.thirdPlace?.[0];

  return {
    id: `${completedAt.getTime()}-${selectedTeam?.code || "manager"}`,
    edition: 2026,
    year: 2026,
    champion: podium.champion || null,
    championFlag: getWinnerFlag(finalMatch),
    runnerUp: podium.runnerUp || null,
    runnerUpFlag: getLoserFlag(finalMatch),
    thirdPlace: podium.thirdPlace || null,
    thirdPlaceFlag: getWinnerFlag(thirdPlaceMatch),
    fourthPlace: podium.fourthPlace || null,
    fourthPlaceFlag: getLoserFlag(thirdPlaceMatch),
    selectedTeam: selectedTeam?.name || null,
    selectedTeamCode: selectedTeam?.code || null,
    selectedTeamFlag: selectedTeam?.flag || null,
    selectedTeamFinish,
    selectedTeamStats: selectedTeam?.code ? buildCampaignStats(tournament, selectedTeam.code) : null,
    topScorer: toHistoryAward(individual.goldenBoot),
    bestPlayer: toHistoryAward(individual.bestPlayer),
    goldenGlove: toHistoryAward(individual.goldenGlove),
    dateCompleted: completedAt.toISOString(),
  };
}

export function archiveCompletedTournament({ career, history, achievements, tournament, selectedTeam, awards, completedAt = new Date() }) {
  const record = buildTournamentHistoryRecord({ tournament, selectedTeam, awards, completedAt });
  const nextCareer = updateCurrentTournamentFinish(career, tournament, selectedTeam?.code);
  const unlockedAt = completedAt.toISOString();
  const tournamentAchievements = buildTournamentAchievements({ tournament, selectedTeam, awards, unlockedAt });
  const achievementState = mergeAchievements(achievements, tournamentAchievements);
  const reputationGain = reputationGainForFinish(record.selectedTeamFinish) + bonusReputationForAchievements(achievementState.unlocked);

  nextCareer.tournamentsPlayed += 1;
  if (record.selectedTeamFinish === "World Cup Champions") {
    nextCareer.trophiesWon += 1;
  }
  nextCareer.reputation = clamp(toNumber(nextCareer.reputation) + reputationGain, 0, 100);
  nextCareer.reputationTitle = getReputationTitle(nextCareer.reputation);

  if (isBetterFinish(nextCareer.bestTournamentFinish, record.selectedTeamFinish)) {
    nextCareer.bestTournamentFinish = record.selectedTeamFinish;
  }

  return {
    career: normalizeManagerCareer(nextCareer),
    history: [...normalizeTournamentHistory(history), record],
    achievements: achievementState.achievements,
    newAchievements: achievementState.unlocked,
    reputationGain,
    record,
  };
}
