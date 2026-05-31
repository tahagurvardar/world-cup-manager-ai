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

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function calculateWinRate(wins, gamesManaged) {
  return gamesManaged ? Math.round((wins / gamesManaged) * 100) : 0;
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

export function normalizeManagerCareer(career = {}) {
  const gamesManaged = toNumber(career.gamesManaged);
  const wins = toNumber(career.wins);
  const draws = toNumber(career.draws);
  const losses = toNumber(career.losses);

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
    topScorer: toHistoryAward(individual.goldenBoot),
    bestPlayer: toHistoryAward(individual.bestPlayer),
    goldenGlove: toHistoryAward(individual.goldenGlove),
    dateCompleted: completedAt.toISOString(),
  };
}

export function archiveCompletedTournament({ career, history, tournament, selectedTeam, awards, completedAt = new Date() }) {
  const record = buildTournamentHistoryRecord({ tournament, selectedTeam, awards, completedAt });
  const nextCareer = updateCurrentTournamentFinish(career, tournament, selectedTeam?.code);

  nextCareer.tournamentsPlayed += 1;
  if (record.selectedTeamFinish === "World Cup Champions") {
    nextCareer.trophiesWon += 1;
  }

  if (isBetterFinish(nextCareer.bestTournamentFinish, record.selectedTeamFinish)) {
    nextCareer.bestTournamentFinish = record.selectedTeamFinish;
  }

  return {
    career: normalizeManagerCareer(nextCareer),
    history: [...normalizeTournamentHistory(history), record],
    record,
  };
}
