import { DEFAULT_TACTICS, GameState } from "../models/GameState.js";
import { findTeamByCode, teams } from "../data/teams.js";
import { generateMatchReport, generateNewsHeadline, generateTacticalAdvice } from "../services/aiService.js";
import {
  archiveCompletedTournament,
  applyManagerMatchResult,
  normalizeManagerCareer,
  normalizeTournamentHistory,
  updateCurrentTournamentFinish,
} from "../services/managerCareerService.js";
import { buildTournamentAwards, buildTournamentPlayerStats } from "../services/playerStatsService.js";
import { getDefaultOpponentTactics, simulateKnockoutMatch, simulateMatch } from "../services/simulationService.js";
import {
  buildTournamentSnapshot,
  getMatchdayFixtures,
  getNextFixture,
  getNextGlobalMatchday,
} from "../services/tournamentService.js";

const ALLOWED_TACTICS = {
  formation: ["4-3-3", "4-2-3-1", "3-5-2", "4-4-2", "5-3-2"],
  mentality: ["defensive", "balanced", "attacking"],
  pressing: ["low", "medium", "high"],
  tempo: ["slow", "normal", "fast"],
  defensiveLine: ["low", "medium", "high"],
};

async function getOrCreateGameState(userId) {
  let state = await GameState.findOne({ user: userId });

  if (!state) {
    state = await GameState.create({ user: userId, tactics: DEFAULT_TACTICS });
  }

  return state;
}

function plainTactics(tactics) {
  return tactics?.toObject ? tactics.toObject() : { ...DEFAULT_TACTICS, ...tactics };
}

function getOpponent(fixture, selectedTeamCode) {
  const opponentCode = fixture.homeTeamCode === selectedTeamCode ? fixture.awayTeamCode : fixture.homeTeamCode;
  return findTeamByCode(opponentCode);
}

function withTeamNames(fixture) {
  if (!fixture) return null;
  const home = findTeamByCode(fixture.homeTeamCode);
  const away = findTeamByCode(fixture.awayTeamCode);

  return {
    ...fixture,
    homeTeam: home?.name || fixture.homeTeamCode,
    awayTeam: away?.name || fixture.awayTeamCode,
  };
}

function getResultWinner(match) {
  if (match.knockout?.winnerTeam) return match.knockout.winnerTeam;
  if (match.score.home === match.score.away) return null;
  return match.score.home > match.score.away ? match.teams.home : match.teams.away;
}

function getResultLoser(match) {
  if (match.knockout?.loserTeam) return match.knockout.loserTeam;
  if (match.score.home === match.score.away) return null;
  return match.score.home > match.score.away ? match.teams.away : match.teams.home;
}

function createFixtureResult(fixture, selectedTeamCode, userTactics, seedSuffix, playedAt) {
  const homeTeam = findTeamByCode(fixture.homeTeamCode);
  const awayTeam = findTeamByCode(fixture.awayTeamCode);
  const homeTactics = homeTeam.code === selectedTeamCode ? userTactics : getDefaultOpponentTactics(homeTeam);
  const awayTactics = awayTeam.code === selectedTeamCode ? userTactics : getDefaultOpponentTactics(awayTeam);
  const simulated = simulateMatch(homeTeam, awayTeam, homeTactics, awayTactics, `${fixture.id}-${seedSuffix}`);

  return {
    ...simulated,
    fixtureId: fixture.id,
    stage: fixture.stage,
    group: fixture.group,
    matchday: fixture.matchday,
    globalMatchday: fixture.globalMatchday,
    venue: fixture.venue,
    playedAt,
  };
}

function createKnockoutFixtureResult(fixture, selectedTeamCode, userTactics, seedSuffix, playedAt) {
  const homeTeam = findTeamByCode(fixture.homeTeamCode);
  const awayTeam = findTeamByCode(fixture.awayTeamCode);
  const homeTactics = homeTeam.code === selectedTeamCode ? userTactics : getDefaultOpponentTactics(homeTeam);
  const awayTactics = awayTeam.code === selectedTeamCode ? userTactics : getDefaultOpponentTactics(awayTeam);
  const simulated = simulateKnockoutMatch(
    homeTeam,
    awayTeam,
    homeTactics,
    awayTactics,
    `${fixture.id}-${seedSuffix}`,
    fixture.stageName,
  );

  return {
    ...simulated,
    fixtureId: fixture.id,
    stage: fixture.stage,
    stageName: fixture.stageName,
    homeSeed: fixture.homeSeed,
    awaySeed: fixture.awaySeed,
    playedAt,
  };
}

function formatManOfTheMatch(match) {
  if (!match?.manOfTheMatch) return "TBD";
  return `${match.manOfTheMatch.name} (${match.manOfTheMatch.rating})`;
}

function buildTournamentPayload(state) {
  const tournament = buildTournamentSnapshot(state.selectedTeamCode, state.results);
  const playerStats = state.playerStats?.players ? state.playerStats : buildTournamentPlayerStats(state.results);
  const awards = state.tournamentAwards?.individual ? state.tournamentAwards : buildTournamentAwards(tournament, playerStats);
  const managerCareer = state.selectedTeamCode
    ? updateCurrentTournamentFinish(state.managerCareer, tournament, state.selectedTeamCode)
    : { ...normalizeManagerCareer(state.managerCareer), currentTournamentFinish: "Awaiting team selection" };

  return {
    ...tournament,
    playerStats,
    awards,
    managerCareer,
    tournamentHistory: normalizeTournamentHistory(state.tournamentHistory),
  };
}

function applyDerivedTournamentState(state, nextResults, tournamentAfter) {
  const playerStats = buildTournamentPlayerStats(nextResults);
  const awards = buildTournamentAwards(tournamentAfter, playerStats);

  state.playerStats = playerStats;
  state.tournamentAwards = awards;
  state.markModified("playerStats");
  state.markModified("tournamentAwards");

  return { playerStats, awards };
}

function applyManagerCareerProgress(state, managerMatch, selectedTeamCode, tournamentAfter) {
  const careerWithMatch = managerMatch
    ? applyManagerMatchResult(state.managerCareer, managerMatch, selectedTeamCode)
    : normalizeManagerCareer(state.managerCareer);

  state.managerCareer = updateCurrentTournamentFinish(careerWithMatch, tournamentAfter, selectedTeamCode);
  state.markModified("managerCareer");
}

function formatAwardForNews(award, fallback) {
  if (!award) return fallback;
  return `${award.name} (${award.teamName}, ${award.value})`;
}

function getFinalScoreLabel(tournamentAfter) {
  const finalMatch = tournamentAfter.knockout?.final?.[0];
  if (!finalMatch?.score) return "the Final";
  const winnerIsHome = finalMatch.winnerTeamCode === finalMatch.homeTeamCode;

  return winnerIsHome ? `${finalMatch.score.home}-${finalMatch.score.away}` : `${finalMatch.score.away}-${finalMatch.score.home}`;
}

function buildTournamentCompletionNews(tournamentAfter, awards, selectedTeamCode) {
  const createdAt = new Date().toISOString();
  const podium = awards?.podium || {};
  const individual = awards?.individual || {};
  const selectedTeam = findTeamByCode(selectedTeamCode);
  const selectedStatus = tournamentAfter.selectedTeamStatus?.qualificationStatus || "Tournament complete";
  const finalScore = getFinalScoreLabel(tournamentAfter);

  return [
    {
      id: `champion-${Date.now()}`,
      type: "champion",
      headline: `${podium.champion} crowned World Cup champions`,
      summary: `${podium.champion} defeated ${podium.runnerUp} ${finalScore} in the Final. ${podium.thirdPlace} claimed third place ahead of ${podium.fourthPlace}.`,
      createdAt,
    },
    {
      id: `manager-tournament-status-${Date.now()}`,
      type: "manager-tournament-status",
      headline: `${selectedTeam?.name || "Manager team"} finish: ${selectedStatus}`,
      summary: `${selectedTeam?.name || "The manager's team"} completed the 2026-style tournament with a final status of ${selectedStatus}.`,
      createdAt,
    },
    {
      id: `tournament-awards-${Date.now()}`,
      type: "tournament-awards",
      headline: `${individual.goldenBoot?.name || "Golden Boot winner"} leads final tournament awards`,
      summary: `Golden Boot: ${formatAwardForNews(individual.goldenBoot, "TBD")}. Best Player: ${formatAwardForNews(individual.bestPlayer, "TBD")}. Golden Glove: ${formatAwardForNews(individual.goldenGlove, "TBD")}.`,
      createdAt,
    },
  ];
}

function archiveTournamentIfComplete(state, tournamentAfter, awards, selectedTeam) {
  if (!tournamentAfter.tournamentComplete || state.currentTournamentArchived) {
    return [];
  }

  const archived = archiveCompletedTournament({
    career: state.managerCareer,
    history: state.tournamentHistory,
    tournament: tournamentAfter,
    selectedTeam,
    awards,
  });

  state.managerCareer = archived.career;
  state.tournamentHistory = archived.history;
  state.currentTournamentArchived = true;
  state.markModified("managerCareer");
  state.markModified("tournamentHistory");

  return buildTournamentCompletionNews(tournamentAfter, awards, selectedTeam.code);
}

async function ensureCompletedTournamentArchived(state) {
  const selectedTeam = state.selectedTeamCode ? findTeamByCode(state.selectedTeamCode) : null;
  if (!selectedTeam || state.currentTournamentArchived) return;

  const tournament = buildTournamentSnapshot(selectedTeam.code, state.results);
  if (!tournament.tournamentComplete) return;

  const playerStats = state.playerStats?.players ? state.playerStats : buildTournamentPlayerStats(state.results);
  const awards = state.tournamentAwards?.individual ? state.tournamentAwards : buildTournamentAwards(tournament, playerStats);
  const news = archiveTournamentIfComplete(state, tournament, awards, selectedTeam);

  if (news.length) {
    state.news.push(...news);
    state.markModified("news");
  }

  await state.save();
}

function buildMatchdayNews(matches, managerMatch, managerReport, tournamentAfter, selectedTeamCode) {
  const createdAt = new Date().toISOString();
  const news = [
    {
      id: `${managerMatch.fixtureId}-manager-${Date.now()}`,
      type: "manager-match",
      headline: generateNewsHeadline(managerMatch),
      summary: `${managerReport.shortSummary} Man of the Match: ${formatManOfTheMatch(managerMatch)}.`,
      manOfTheMatch: managerMatch.manOfTheMatch,
      matchId: managerMatch.fixtureId,
      createdAt,
    },
  ];

  const upsets = matches
    .map((match) => {
      const winner = getResultWinner(match);
      const loser = getResultLoser(match);
      if (!winner || !loser) return null;

      const winnerTeam = findTeamByCode(winner.code);
      const loserTeam = findTeamByCode(loser.code);
      const upsetGap = loserTeam.overall - winnerTeam.overall;

      return { match, winnerTeam, loserTeam, upsetGap };
    })
    .filter((item) => item && item.upsetGap >= 4)
    .sort((a, b) => b.upsetGap - a.upsetGap || b.match.score.home + b.match.score.away - (a.match.score.home + a.match.score.away));

  if (upsets[0] && upsets[0].match.fixtureId !== managerMatch.fixtureId) {
    news.push({
      id: `${upsets[0].match.fixtureId}-upset-${Date.now()}`,
      type: "biggest-upset",
      headline: `${upsets[0].winnerTeam.name} stun ${upsets[0].loserTeam.name} in Group ${upsets[0].match.group}`,
      summary: `${upsets[0].winnerTeam.name} overcame a ${upsets[0].upsetGap}-point overall gap to reshape the qualification race. Man of the Match: ${formatManOfTheMatch(upsets[0].match)}.`,
      manOfTheMatch: upsets[0].match.manOfTheMatch,
      matchId: upsets[0].match.fixtureId,
      createdAt,
    });
  }

  const highScoringMatch = matches
    .filter((match) => match.fixtureId !== managerMatch.fixtureId)
    .sort((a, b) => b.score.home + b.score.away - (a.score.home + a.score.away))[0];
  if (highScoringMatch && highScoringMatch.score.home + highScoringMatch.score.away >= 4) {
    news.push({
      id: `${highScoringMatch.fixtureId}-goals-${Date.now()}`,
      type: "highest-scoring",
      headline: `${highScoringMatch.teams.home.name} and ${highScoringMatch.teams.away.name} deliver matchday thriller`,
      summary: `The ${highScoringMatch.score.home}-${highScoringMatch.score.away} result was the highest-scoring match of global matchday ${highScoringMatch.globalMatchday}. Man of the Match: ${formatManOfTheMatch(highScoringMatch)}.`,
      manOfTheMatch: highScoringMatch.manOfTheMatch,
      matchId: highScoringMatch.fixtureId,
      createdAt,
    });
  }

  if (tournamentAfter.groupStageComplete) {
    const selectedStatus = tournamentAfter.selectedTeamStatus;
    const qualifiedNames = tournamentAfter.qualifiedTeams.slice(0, 8).map((team) => team.teamName).join(", ");
    const selectedTeam = findTeamByCode(selectedTeamCode);

    news.push({
      id: `qualification-${Date.now()}`,
      type: "qualification",
      headline: "Round of 32 bracket confirmed after group stage finale",
      summary: `${qualifiedNames} and the rest of the 32-team field advance into the simplified 2026-style knockout bracket.`,
      createdAt,
    });

    if (selectedStatus) {
      news.push({
        id: `manager-qualification-${Date.now()}`,
        type: "manager-qualification",
        headline: `${selectedTeam.name}: ${selectedStatus.qualificationStatus}`,
        summary: `${selectedTeam.name} finished Group ${selectedStatus.group} in position ${selectedStatus.groupPosition}.`,
        createdAt,
      });
    }
  }

  return news;
}

function buildKnockoutNews(matches, managerMatch, featuredReport, tournamentAfter, selectedTeamCode, roundLabel) {
  const createdAt = new Date().toISOString();
  const news = [];

  if (managerMatch) {
    news.push({
      id: `${managerMatch.fixtureId}-manager-knockout-${Date.now()}`,
      type: "manager-knockout",
      headline: generateNewsHeadline(managerMatch),
      summary: `${featuredReport.shortSummary} Man of the Match: ${formatManOfTheMatch(managerMatch)}.`,
      manOfTheMatch: managerMatch.manOfTheMatch,
      matchId: managerMatch.fixtureId,
      createdAt,
    });
  }

  const upsets = matches
    .map((match) => {
      const winner = getResultWinner(match);
      const loser = getResultLoser(match);
      if (!winner || !loser) return null;

      const winnerTeam = findTeamByCode(winner.code);
      const loserTeam = findTeamByCode(loser.code);
      const upsetGap = loserTeam.overall - winnerTeam.overall;

      return { match, winnerTeam, loserTeam, upsetGap };
    })
    .filter((item) => item && item.upsetGap >= 4)
    .sort((a, b) => b.upsetGap - a.upsetGap || b.match.score.home + b.match.score.away - (a.match.score.home + a.match.score.away));

  if (upsets[0] && upsets[0].match.fixtureId !== managerMatch?.fixtureId) {
    news.push({
      id: `${upsets[0].match.fixtureId}-knockout-upset-${Date.now()}`,
      type: "knockout-upset",
      headline: `${upsets[0].winnerTeam.name} knock out ${upsets[0].loserTeam.name} in ${roundLabel} shock`,
      summary: `${upsets[0].winnerTeam.name} overcame a ${upsets[0].upsetGap}-point overall gap to stay alive in the tournament. Man of the Match: ${formatManOfTheMatch(upsets[0].match)}.`,
      manOfTheMatch: upsets[0].match.manOfTheMatch,
      matchId: upsets[0].match.fixtureId,
      createdAt,
    });
  }

  const highScoringMatch = matches
    .filter((match) => match.fixtureId !== managerMatch?.fixtureId)
    .sort((a, b) => b.score.home + b.score.away - (a.score.home + a.score.away))[0];
  if (highScoringMatch && highScoringMatch.score.home + highScoringMatch.score.away >= 4) {
    news.push({
      id: `${highScoringMatch.fixtureId}-knockout-goals-${Date.now()}`,
      type: "knockout-thriller",
      headline: `${highScoringMatch.teams.home.name} and ${highScoringMatch.teams.away.name} serve up ${roundLabel} thriller`,
      summary: `The ${highScoringMatch.score.home}-${highScoringMatch.score.away} scoreline was the highest-scoring tie of the round. Man of the Match: ${formatManOfTheMatch(highScoringMatch)}.`,
      manOfTheMatch: highScoringMatch.manOfTheMatch,
      matchId: highScoringMatch.fixtureId,
      createdAt,
    });
  }

  const featuredMatch = managerMatch || matches[0];
  const winner = featuredMatch ? getResultWinner(featuredMatch) : null;
  const loser = featuredMatch ? getResultLoser(featuredMatch) : null;

  if (winner && loser) {
    const selectedTeam = findTeamByCode(selectedTeamCode);
    const selectedStatus = tournamentAfter.selectedTeamStatus?.qualificationStatus;

    news.push({
      id: `${featuredMatch.fixtureId}-knockout-progress-${Date.now()}`,
      type: "knockout-progress",
      headline: generateNewsHeadline(featuredMatch),
      summary:
        featuredMatch.stage === "final"
          ? `${winner.name} are crowned champions after defeating ${loser.name}. Man of the Match: ${formatManOfTheMatch(featuredMatch)}.`
          : featuredMatch.stage === "thirdPlace"
            ? `${winner.name} finish third after holding off ${loser.name}. Man of the Match: ${formatManOfTheMatch(featuredMatch)}.`
            : `${winner.name} advance, while ${loser.name} exit the simplified knockout bracket. Man of the Match: ${formatManOfTheMatch(featuredMatch)}.`,
      manOfTheMatch: featuredMatch.manOfTheMatch,
      matchId: featuredMatch.fixtureId,
      createdAt,
    });

    if (selectedStatus && selectedTeam) {
      news.push({
        id: `manager-status-${featuredMatch.fixtureId}-${Date.now()}`,
        type: "manager-status",
        headline: `${selectedTeam.name}: ${selectedStatus}`,
        summary: `${tournamentAfter.progressText}`,
        createdAt,
      });
    }
  }

  return news;
}

function buildDashboardPayload(state) {
  const selectedTeam = state.selectedTeamCode ? findTeamByCode(state.selectedTeamCode) : null;
  const baseCareer = normalizeManagerCareer(state.managerCareer);
  const tournamentHistory = normalizeTournamentHistory(state.tournamentHistory);

  if (!selectedTeam) {
    return {
      needsTeamSelection: true,
      selectedTeam: null,
      teams: teams.map(({ code, name, overall, group }) => ({ code, name, overall, group })),
      managerCareer: { ...baseCareer, currentTournamentFinish: "Awaiting team selection" },
      tournamentHistory,
    };
  }

  const tactics = plainTactics(state.tactics);
  const nextFixture = getNextFixture(selectedTeam.code, state.results);
  const opponent = nextFixture ? getOpponent(nextFixture, selectedTeam.code) : null;
  const tournament = buildTournamentSnapshot(selectedTeam.code, state.results);
  const managerCareer = updateCurrentTournamentFinish(state.managerCareer, tournament, selectedTeam.code);
  const aiAdvice = opponent
    ? generateTacticalAdvice(selectedTeam, opponent, tactics)
    : {
        opponentStrengths: [],
        opponentWeaknesses: [],
        recommendedApproach: "Group fixtures are complete. Prepare for the knockout draw.",
        dangerPlayers: [],
        keyTacticalAdvice: ["Review stamina, cards, and the strongest eleven before the next knockout match."],
      };

  return {
    selectedTeam: {
      code: selectedTeam.code,
      name: selectedTeam.name,
      group: selectedTeam.group,
      overall: selectedTeam.overall,
      morale: selectedTeam.morale,
      form: selectedTeam.form,
      style: selectedTeam.style,
      groupPosition: tournament.selectedTeamStatus?.groupPosition || null,
      qualificationStatus: tournament.selectedTeamStatus?.qualificationStatus || "Awaiting group matches",
    },
    nextMatch: withTeamNames(nextFixture),
    nextOpponent: opponent
      ? {
          code: opponent.code,
          name: opponent.name,
          overall: opponent.overall,
        }
      : null,
    tournamentProgress: tournament.progressText,
    tournamentStage: tournament.currentStage,
    routeToFinal: tournament.routeToFinal,
    managerCareer,
    tournamentHistory,
    canSimulate: Boolean(tournament.nextGlobalMatchday || tournament.nextKnockoutRound),
    nextKnockoutRound: tournament.nextKnockoutRound
      ? {
          stage: tournament.nextKnockoutRound.stage,
          stageName: tournament.nextKnockoutRound.stageName,
          fixtureCount: tournament.nextKnockoutRound.fixtures.length,
        }
      : null,
    currentGlobalMatchday: tournament.nextGlobalMatchday,
    qualificationStatus: tournament.selectedTeamStatus?.qualificationStatus || "Awaiting group matches",
    groupPosition: tournament.selectedTeamStatus?.groupPosition || null,
    morale: selectedTeam.morale,
    form: selectedTeam.form,
    aiAdvice,
    tactics,
    keyPlayers: [...selectedTeam.players].sort((a, b) => b.overall - a.overall).slice(0, 5),
    recentResults: [...state.results]
      .filter((result) => result.teams.home.code === selectedTeam.code || result.teams.away.code === selectedTeam.code)
      .slice(-3)
      .reverse(),
    latestNews: [...state.news].slice(-3).reverse(),
  };
}

export async function selectTeam(req, res) {
  const { teamCode } = req.body;
  const team = teamCode ? findTeamByCode(teamCode.toUpperCase()) : null;

  if (!team) {
    return res.status(400).json({ message: "A valid teamCode is required." });
  }

  const state = await getOrCreateGameState(req.user._id);
  await ensureCompletedTournamentArchived(state);
  state.selectedTeamCode = team.code;
  state.tactics = { ...DEFAULT_TACTICS };
  state.results = [];
  state.news = [];
  state.playerStats = { players: [], leaders: {} };
  state.tournamentAwards = { completed: false, podium: {}, individual: {} };
  state.managerCareer = updateCurrentTournamentFinish(state.managerCareer, buildTournamentSnapshot(team.code, []), team.code);
  state.currentTournamentArchived = false;
  state.currentStage = "group";
  state.markModified("managerCareer");
  await state.save();

  return res.json({
    message: `${team.name} selected.`,
    dashboard: buildDashboardPayload(state),
  });
}

export async function getDashboard(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  await ensureCompletedTournamentArchived(state);
  return res.json({ dashboard: buildDashboardPayload(state) });
}

export async function startNewTournament(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  await ensureCompletedTournamentArchived(state);

  const managerCareer = {
    ...normalizeManagerCareer(state.managerCareer),
    currentTournamentFinish: "Awaiting team selection",
  };

  state.selectedTeamCode = null;
  state.tactics = { ...DEFAULT_TACTICS };
  state.results = [];
  state.news = [];
  state.playerStats = { players: [], leaders: {} };
  state.tournamentAwards = { completed: false, podium: {}, individual: {} };
  state.managerCareer = managerCareer;
  state.currentTournamentArchived = false;
  state.currentStage = "group";
  state.markModified("managerCareer");
  await state.save();

  return res.json({
    message: "New tournament started. Career stats and history were kept.",
    dashboard: buildDashboardPayload(state),
  });
}

export async function getSquad(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  const team = state.selectedTeamCode ? findTeamByCode(state.selectedTeamCode) : null;

  if (!team) {
    return res.status(400).json({ message: "Select a national team first." });
  }

  return res.json({ team: team.name, players: team.players });
}

export async function getTactics(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  return res.json({ tactics: plainTactics(state.tactics) });
}

export async function updateTactics(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  const nextTactics = { ...plainTactics(state.tactics), ...req.body };

  Object.entries(ALLOWED_TACTICS).forEach(([field, allowedValues]) => {
    if (!allowedValues.includes(nextTactics[field])) {
      throw new Error(`Invalid ${field}: ${nextTactics[field]}`);
    }
  });

  state.tactics = nextTactics;
  await state.save();

  return res.json({
    message: "Tactics updated.",
    tactics: plainTactics(state.tactics),
  });
}

export async function simulateNextMatch(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  const selectedTeam = state.selectedTeamCode ? findTeamByCode(state.selectedTeamCode) : null;

  if (!selectedTeam) {
    return res.status(400).json({ message: "Select a national team before simulating matches." });
  }

  const globalMatchday = getNextGlobalMatchday(state.results);
  const userTactics = plainTactics(state.tactics);
  const playedAt = new Date().toISOString();

  if (!globalMatchday) {
    const tournamentBefore = buildTournamentSnapshot(selectedTeam.code, state.results);
    const nextKnockoutRound = tournamentBefore.nextKnockoutRound;

    if (!nextKnockoutRound?.fixtures?.length) {
      return res.status(400).json({
        message: tournamentBefore.tournamentComplete ? "The tournament is complete." : "No playable knockout fixtures are ready.",
      });
    }

    const matches = nextKnockoutRound.fixtures.map((fixture, index) =>
      createKnockoutFixtureResult(fixture, selectedTeam.code, userTactics, `${state.results.length}-${index}`, playedAt),
    );
    const managerMatch = matches.find(
      (match) => match.teams.home.code === selectedTeam.code || match.teams.away.code === selectedTeam.code,
    );
    const featuredMatch = managerMatch || matches[0];
    const report = generateMatchReport(featuredMatch);
    const headline = generateNewsHeadline(featuredMatch);
    const nextResults = [...state.results, ...matches];
    const tournamentAfter = buildTournamentSnapshot(selectedTeam.code, nextResults);
    const { playerStats, awards } = applyDerivedTournamentState(state, nextResults, tournamentAfter);
    applyManagerCareerProgress(state, managerMatch, selectedTeam.code, tournamentAfter);
    const completionNews = archiveTournamentIfComplete(state, tournamentAfter, awards, selectedTeam);
    const news = [
      ...buildKnockoutNews(matches, managerMatch, report, tournamentAfter, selectedTeam.code, nextKnockoutRound.stageName),
      ...completionNews,
    ];

    state.results.push(...matches);
    state.news.push(...news);
    state.currentStage = tournamentAfter.currentStage;
    state.markModified("results");
    state.markModified("news");
    await state.save();

    return res.json({
      match: featuredMatch,
      managerMatch,
      round: nextKnockoutRound.stageName,
      roundResults: matches,
      matchdayResults: matches,
      otherResults: matches.filter((match) => match.fixtureId !== featuredMatch.fixtureId),
      report,
      headline,
      news,
      tournament: { ...tournamentAfter, playerStats, awards },
      dashboard: buildDashboardPayload(state),
    });
  }

  const matchdayFixtures = getMatchdayFixtures(globalMatchday, state.results);
  if (!matchdayFixtures.length) {
    return res.status(400).json({ message: "This matchday has already been played." });
  }

  const matches = matchdayFixtures.map((fixture, index) =>
    createFixtureResult(fixture, selectedTeam.code, userTactics, `${state.results.length}-${index}`, playedAt),
  );
  const managerMatch = matches.find(
    (match) => match.teams.home.code === selectedTeam.code || match.teams.away.code === selectedTeam.code,
  );

  if (!managerMatch) {
    return res.status(400).json({ message: "No manager fixture found for the next global matchday." });
  }

  const report = generateMatchReport(managerMatch);
  const headline = generateNewsHeadline(managerMatch);
  const nextResults = [...state.results, ...matches];
  const tournamentAfter = buildTournamentSnapshot(selectedTeam.code, nextResults);
  const { playerStats, awards } = applyDerivedTournamentState(state, nextResults, tournamentAfter);
  applyManagerCareerProgress(state, managerMatch, selectedTeam.code, tournamentAfter);
  const news = buildMatchdayNews(matches, managerMatch, report, tournamentAfter, selectedTeam.code);

  state.results.push(...matches);
  state.news.push(...news);
  state.currentStage = tournamentAfter.currentStage;
  state.markModified("results");
  state.markModified("news");
  await state.save();

  return res.json({
    match: managerMatch,
    managerMatch,
    matchday: globalMatchday,
    matchdayResults: matches,
    otherResults: matches.filter((match) => match.fixtureId !== managerMatch.fixtureId),
    report,
    headline,
    news,
    tournament: { ...tournamentAfter, playerStats, awards },
    dashboard: buildDashboardPayload(state),
  });
}

export async function getTournament(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  await ensureCompletedTournamentArchived(state);
  return res.json({
    tournament: buildTournamentPayload(state),
  });
}

export async function getNews(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  await ensureCompletedTournamentArchived(state);
  return res.json({ news: [...state.news].reverse() });
}
