import { DEFAULT_TACTICS, GameState } from "../models/GameState.js";
import { weatherSimulationModifier } from "../data/atmosphere.js";
import { findTeamByCode, teams } from "../data/teams.js";
import { generateMatchReport, generateNewsHeadline, generateTacticalAdvice } from "../services/aiService.js";
import {
  archiveCompletedTournament,
  applyManagerMatchResult,
  normalizeManagerCareer,
  normalizeAchievements,
  normalizeTournamentHistory,
  updateCurrentTournamentFinish,
} from "../services/managerCareerService.js";
import { buildTournamentAwards, buildTournamentPlayerStats } from "../services/playerStatsService.js";
import { buildPlayerProfile } from "../services/playerProfileService.js";
import {
  buildAvailableLineup,
  buildSquadFromInput,
  decorateSquadSelection,
  generateSquadSelection,
  lineupPlayers,
  normalizeFormation,
  resolveSquadSelection,
} from "../services/squadService.js";
import {
  availabilitySummary,
  buildAvailabilityMap,
  decrementActiveRecords,
  injuryRecordsFromMatch,
  processMatchCards,
  unavailableIndexSet,
} from "../services/availabilityService.js";
import { getDefaultOpponentTactics, simulateKnockoutMatch, simulateMatch } from "../services/simulationService.js";
import {
  applyConferenceAnswers,
  buildConferenceNews,
  DEFAULT_MEDIA,
  generatePostConference,
  generatePreConference,
  mediaMatchModifier,
  mediaTrends,
  normalizeMedia,
} from "../services/pressConferenceService.js";
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
    homeFlag: home?.flag || null,
    awayFlag: away?.flag || null,
  };
}

function toTeamRef(team) {
  if (!team) return null;
  return {
    code: team.code,
    name: team.name,
    flag: team.flag || null,
  };
}

function getMatchTeamRefs(match) {
  if (!match?.teams) return [];
  return [toTeamRef(match.teams.home), toTeamRef(match.teams.away)].filter(Boolean);
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

function buildLineupOptions(homeTeam, awayTeam, selectedTeamCode, userLineup, userModifier, atmosphereModifier) {
  const options = atmosphereModifier ? { atmosphereModifier } : {};
  if (homeTeam.code === selectedTeamCode) {
    if (userLineup) options.homeLineup = userLineup;
    if (userModifier) options.homeModifier = userModifier;
  } else if (awayTeam.code === selectedTeamCode) {
    if (userLineup) options.awayLineup = userLineup;
    if (userModifier) options.awayModifier = userModifier;
  }
  return options;
}

function fixtureAtmosphereFields(fixture) {
  return {
    stadiumName: fixture.stadiumName || fixture.venue || "Tournament stadium",
    venue: fixture.stadiumName || fixture.venue || "Tournament stadium",
    city: fixture.city || null,
    country: fixture.country || null,
    capacity: fixture.capacity || null,
    attendance: fixture.attendance || null,
    weather: fixture.weather || null,
    referee: fixture.referee || null,
  };
}

function createFixtureResult(fixture, selectedTeamCode, userTactics, seedSuffix, playedAt, userLineup, userModifier) {
  const homeTeam = findTeamByCode(fixture.homeTeamCode);
  const awayTeam = findTeamByCode(fixture.awayTeamCode);
  const homeTactics = homeTeam.code === selectedTeamCode ? userTactics : getDefaultOpponentTactics(homeTeam);
  const awayTactics = awayTeam.code === selectedTeamCode ? userTactics : getDefaultOpponentTactics(awayTeam);
  const atmosphereModifier = weatherSimulationModifier(fixture.weather);
  const lineupOptions = buildLineupOptions(homeTeam, awayTeam, selectedTeamCode, userLineup, userModifier, atmosphereModifier);
  const simulated = simulateMatch(homeTeam, awayTeam, homeTactics, awayTactics, `${fixture.id}-${seedSuffix}`, lineupOptions);

  return {
    ...simulated,
    ...fixtureAtmosphereFields(fixture),
    fixtureId: fixture.id,
    stage: fixture.stage,
    group: fixture.group,
    matchday: fixture.matchday,
    globalMatchday: fixture.globalMatchday,
    playedAt,
  };
}

function createKnockoutFixtureResult(fixture, selectedTeamCode, userTactics, seedSuffix, playedAt, userLineup, userModifier) {
  const homeTeam = findTeamByCode(fixture.homeTeamCode);
  const awayTeam = findTeamByCode(fixture.awayTeamCode);
  const homeTactics = homeTeam.code === selectedTeamCode ? userTactics : getDefaultOpponentTactics(homeTeam);
  const awayTactics = awayTeam.code === selectedTeamCode ? userTactics : getDefaultOpponentTactics(awayTeam);
  const atmosphereModifier = weatherSimulationModifier(fixture.weather);
  const lineupOptions = buildLineupOptions(homeTeam, awayTeam, selectedTeamCode, userLineup, userModifier, atmosphereModifier);
  const simulated = simulateKnockoutMatch(
    homeTeam,
    awayTeam,
    homeTactics,
    awayTactics,
    `${fixture.id}-${seedSuffix}`,
    fixture.stageName,
    lineupOptions,
  );

  return {
    ...simulated,
    ...fixtureAtmosphereFields(fixture),
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

function formatAttendance(attendance) {
  return Number(attendance || 0).toLocaleString("en-US");
}

function formatWeather(weather) {
  if (!weather) return "Weather TBD";
  if (weather.label) return weather.label;
  return `${weather.condition || "Weather"} ${weather.temperatureC ?? ""}\u00b0C`.trim();
}

function matchStageForAtmosphere(match) {
  if (match.stage === "group") return match.group ? `Group ${match.group} matchday` : "group match";
  if (match.stage === "quarterFinal") return "quarter-final";
  if (match.stage === "semiFinal") return "semi-final";
  if (match.stage === "thirdPlace") return "third-place match";
  if (match.stage === "final") return "final";
  return (match.stageName || "match").toLowerCase();
}

function buildAtmosphereNews(matches, preferredMatch, createdAt) {
  const news = [];
  const featured = preferredMatch || matches[0];

  if (featured?.attendance && featured.city) {
    news.push({
      id: `${featured.fixtureId}-attendance-${Date.now()}`,
      type: "match-atmosphere",
      headline: `${formatAttendance(featured.attendance)} expected in ${featured.city}`,
      summary: `${featured.stadiumName || featured.venue} hosts ${featured.teams.home.name} vs ${featured.teams.away.name} in ${featured.city}, ${featured.country}. Weather: ${formatWeather(featured.weather)}. Referee: ${featured.referee?.name || "TBD"}.`,
      matchId: featured.fixtureId,
      teams: getMatchTeamRefs(featured),
      createdAt,
    });
  }

  const weatherCandidates = [preferredMatch, ...matches].filter(Boolean);
  const weatherMatch = weatherCandidates.find((match) => ["Rain", "Hot", "Windy", "Cold"].includes(match.weather?.condition));
  if (weatherMatch) {
    const condition = weatherMatch.weather.condition;
    const headline =
      condition === "Rain"
        ? `Heavy rain expected before ${matchStageForAtmosphere(weatherMatch)}`
        : `${condition} conditions expected in ${weatherMatch.city}`;

    news.push({
      id: `${weatherMatch.fixtureId}-weather-${Date.now()}`,
      type: "weather-watch",
      headline,
      summary: `${formatWeather(weatherMatch.weather)} is forecast at ${weatherMatch.stadiumName || weatherMatch.venue} in ${weatherMatch.city}, ${weatherMatch.country}.`,
      matchId: weatherMatch.fixtureId,
      teams: getMatchTeamRefs(weatherMatch),
      createdAt,
    });
  }

  return news;
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
    achievements: normalizeAchievements(state.achievements),
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
      teams: [toTeamRef(tournamentAfter.knockout?.final?.[0]?.knockout?.winnerTeam), toTeamRef(tournamentAfter.knockout?.final?.[0]?.knockout?.loserTeam)].filter(Boolean),
      createdAt,
    },
    {
      id: `manager-tournament-status-${Date.now()}`,
      type: "manager-tournament-status",
      headline: `${selectedTeam?.name || "Manager team"} finish: ${selectedStatus}`,
      summary: `${selectedTeam?.name || "The manager's team"} completed the 2026-style tournament with a final status of ${selectedStatus}.`,
      teams: [toTeamRef(selectedTeam)].filter(Boolean),
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
    achievements: state.achievements,
    tournament: tournamentAfter,
    selectedTeam,
    awards,
  });

  state.managerCareer = archived.career;
  state.tournamentHistory = archived.history;
  state.achievements = archived.achievements;
  state.currentTournamentArchived = true;
  state.markModified("managerCareer");
  state.markModified("tournamentHistory");
  state.markModified("achievements");

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
      teams: getMatchTeamRefs(managerMatch),
      createdAt,
    },
    ...buildAtmosphereNews(matches, managerMatch, createdAt),
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
      teams: [toTeamRef(upsets[0].winnerTeam), toTeamRef(upsets[0].loserTeam)].filter(Boolean),
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
      teams: getMatchTeamRefs(highScoringMatch),
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
        teams: [toTeamRef(selectedTeam)].filter(Boolean),
        createdAt,
      });
    }
  }

  return news;
}

function buildKnockoutNews(matches, managerMatch, featuredReport, tournamentAfter, selectedTeamCode, roundLabel) {
  const createdAt = new Date().toISOString();
  const news = [...buildAtmosphereNews(matches, managerMatch || matches[0], createdAt)];

  if (managerMatch) {
    news.push({
      id: `${managerMatch.fixtureId}-manager-knockout-${Date.now()}`,
      type: "manager-knockout",
      headline: generateNewsHeadline(managerMatch),
      summary: `${featuredReport.shortSummary} Man of the Match: ${formatManOfTheMatch(managerMatch)}.`,
      manOfTheMatch: managerMatch.manOfTheMatch,
      matchId: managerMatch.fixtureId,
      teams: getMatchTeamRefs(managerMatch),
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
      teams: [toTeamRef(upsets[0].winnerTeam), toTeamRef(upsets[0].loserTeam)].filter(Boolean),
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
      teams: getMatchTeamRefs(highScoringMatch),
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
      teams: getMatchTeamRefs(featuredMatch),
      createdAt,
    });

    if (selectedStatus && selectedTeam) {
      news.push({
        id: `manager-status-${featuredMatch.fixtureId}-${Date.now()}`,
        type: "manager-status",
        headline: `${selectedTeam.name}: ${selectedStatus}`,
        summary: `${tournamentAfter.progressText}`,
        teams: [toTeamRef(selectedTeam)].filter(Boolean),
        createdAt,
      });
    }
  }

  return news;
}

function buildDashboardPayload(state) {
  const selectedTeam = state.selectedTeamCode ? findTeamByCode(state.selectedTeamCode) : null;
  const baseCareer = normalizeManagerCareer(state.managerCareer);
  const achievements = normalizeAchievements(state.achievements);
  const latestAchievement = achievements[achievements.length - 1] || null;
  const tournamentHistory = normalizeTournamentHistory(state.tournamentHistory);
  const latestTournament = tournamentHistory[tournamentHistory.length - 1] || null;
  const lastTournamentWon = Boolean(latestTournament?.selectedTeamCode && latestTournament.selectedTeamFinish === "World Cup Champions");

  if (!selectedTeam) {
    return {
      needsTeamSelection: true,
      selectedTeam: null,
      teams: teams.map(({ code, name, overall, group, region, confederation, flag }) => ({
        code,
        name,
        overall,
        group,
        region,
        confederation,
        flag,
      })),
      managerCareer: { ...baseCareer, currentTournamentFinish: "Awaiting team selection" },
      achievements,
      latestAchievement,
      lastTournamentWon,
      tournamentHistory,
    };
  }

  const tactics = plainTactics(state.tactics);
  const fifaRanking = [...teams].sort((a, b) => b.overall - a.overall).findIndex((team) => team.code === selectedTeam.code) + 1;
  const squad = resolveSquadSelection(selectedTeam, state.squad, tactics.formation);
  const { injuries: stateInjuries, suspensions: stateSuspensions } = getAvailabilityState(state);
  const squadAvailabilityMap = buildAvailabilityMap(selectedTeam.code, stateInjuries, stateSuspensions);
  const decoratedSquad = decorateSquadSelection(selectedTeam, squad, squadAvailabilityMap);
  const squadAvailability = availabilitySummary(selectedTeam, stateInjuries, stateSuspensions);
  const media = getMediaState(state);
  const adjustedMorale = Math.max(1, Math.min(99, selectedTeam.morale + media.moraleBoost));
  const pressConferencePending = Boolean(state.pendingConference && !state.pendingConference.answered);
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
      morale: adjustedMorale,
      form: selectedTeam.form,
      style: selectedTeam.style,
      flag: selectedTeam.flag,
      confederation: selectedTeam.confederation || selectedTeam.region,
      groupPosition: tournament.selectedTeamStatus?.groupPosition || null,
      qualificationStatus: tournament.selectedTeamStatus?.qualificationStatus || "Awaiting group matches",
      fifaRanking,
    },
    nextMatch: withTeamNames(nextFixture),
    nextOpponent: opponent
      ? {
          code: opponent.code,
          name: opponent.name,
          flag: opponent.flag,
          overall: opponent.overall,
        }
      : null,
    tournamentProgress: tournament.progressText,
    tournamentStage: tournament.currentStage,
    routeToFinal: tournament.routeToFinal,
    managerCareer,
    achievements,
    latestAchievement,
    lastTournamentWon,
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
    morale: adjustedMorale,
    form: selectedTeam.form,
    aiAdvice,
    tactics,
    formation: tactics.formation,
    startingXI: decoratedSquad.startingXI,
    bench: decoratedSquad.bench,
    lineupOverall: decoratedSquad.lineupOverall,
    captainIndex: decoratedSquad.captainIndex,
    viceCaptainIndex: decoratedSquad.viceCaptainIndex,
    keyPlayers: selectedTeam.players
      .map((player, index) => ({ ...player, index, teamCode: selectedTeam.code }))
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 5),
    recentResults: [...state.results]
      .filter((result) => result.teams.home.code === selectedTeam.code || result.teams.away.code === selectedTeam.code)
      .slice(-5)
      .reverse(),
    latestNews: [...state.news].slice(-3).reverse(),
    squadAvailability,
    media: { ...media, trends: mediaTrends(media) },
    pressConferencePending,
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
  state.squad = generateSquadSelection(team, DEFAULT_TACTICS.formation);
  state.markModified("squad");
  resetAvailability(state);
  resetMedia(state);
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
  state.squad = null;
  state.markModified("squad");
  resetAvailability(state);
  resetMedia(state);
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

function getAvailabilityState(state) {
  return {
    injuries: Array.isArray(state.injuries) ? state.injuries : [],
    suspensions: Array.isArray(state.suspensions) ? state.suspensions : [],
    yellows: state.accumulatedYellows && typeof state.accumulatedYellows === "object" ? state.accumulatedYellows : {},
  };
}

function resetAvailability(state) {
  state.injuries = [];
  state.suspensions = [];
  state.accumulatedYellows = {};
  state.markModified("injuries");
  state.markModified("suspensions");
  state.markModified("accumulatedYellows");
}

function getMediaState(state) {
  return normalizeMedia(state.media || DEFAULT_MEDIA);
}

function resetMedia(state) {
  state.media = { ...DEFAULT_MEDIA, previous: { ...DEFAULT_MEDIA.previous } };
  state.pressConferences = [];
  state.pendingConference = null;
  state.lastPreConferenceFixtureId = null;
  state.markModified("media");
  state.markModified("pressConferences");
  state.markModified("pendingConference");
}

// Outcome of the manager's most recent played match: "win" | "loss" | "draw" | null.
function lastManagerOutcome(results, teamCode) {
  const last = [...results].reverse().find((result) => result.teams?.home?.code === teamCode || result.teams?.away?.code === teamCode);
  if (!last) return null;
  if (last.knockout?.winnerTeam?.code) return last.knockout.winnerTeam.code === teamCode ? "win" : "loss";
  const isHome = last.teams.home.code === teamCode;
  const teamGoals = isHome ? last.score.home : last.score.away;
  const oppGoals = isHome ? last.score.away : last.score.home;
  if (teamGoals > oppGoals) return "win";
  if (teamGoals < oppGoals) return "loss";
  return "draw";
}

// Builds a pre-match press conference for the manager's next fixture using live context.
function buildPreConference(state, selectedTeam, nextFixture) {
  if (!nextFixture) return null;
  const opponent = getOpponent(nextFixture, selectedTeam.code);
  const tournament = buildTournamentSnapshot(selectedTeam.code, state.results);
  const stageLabel = nextFixture.stageName || (nextFixture.group ? `Group ${nextFixture.group} matchday` : tournament.currentStage || "the next match");

  const { injuries, suspensions } = getAvailabilityState(state);
  const availabilityMap = buildAvailabilityMap(selectedTeam.code, injuries, suspensions);
  const squad = resolveSquadSelection(selectedTeam, state.squad, plainTactics(state.tactics).formation);
  let injuredName = null;
  let suspendedName = null;
  let suspendedIsCaptain = false;
  availabilityMap.forEach((detail, index) => {
    const player = selectedTeam.players[index];
    if (!player) return;
    if (detail.status === "injured" && !injuredName) injuredName = player.name;
    if (detail.status === "suspended" && !suspendedName) {
      suspendedName = player.name;
      suspendedIsCaptain = squad.captainIndex === index;
    }
  });

  const conference = generatePreConference({
    team: selectedTeam,
    opponent,
    stageLabel,
    lastOutcome: lastManagerOutcome(state.results, selectedTeam.code),
    injuredName,
    suspendedName,
    suspendedIsCaptain,
    media: getMediaState(state),
    fixtureId: nextFixture.id,
  });
  return { ...conference, opponentName: opponent?.name || null };
}

function pressConferencePayload(state, selectedTeam) {
  const media = getMediaState(state);
  const base = {
    media: { ...media, trends: mediaTrends(media) },
    history: [...(state.pressConferences || [])].slice(-6).reverse(),
  };

  const pending = state.pendingConference && !state.pendingConference.answered ? state.pendingConference : null;
  if (pending) return { ...base, conference: pending };

  const nextFixture = getNextFixture(selectedTeam.code, state.results);
  if (nextFixture && state.lastPreConferenceFixtureId !== nextFixture.id) {
    const conference = buildPreConference(state, selectedTeam, nextFixture);
    return { ...base, conference, generated: true };
  }

  return { ...base, conference: null };
}

function injuryArticle(injuryType) {
  return /^[aeiou]/i.test(injuryType || "") ? "an" : "a";
}

function countManagerMatches(results, teamCode) {
  return results.filter((result) => result.teams?.home?.code === teamCode || result.teams?.away?.code === teamCode).length;
}

function buildAvailabilityNews(team, lineupChanges, newInjuries, newSuspensions, availabilityMap) {
  const createdAt = new Date().toISOString();
  const teamRefs = [toTeamRef(team)].filter(Boolean);
  const stamp = Date.now();
  const news = [];

  lineupChanges.forEach((change, position) => {
    const detail = availabilityMap.get(change.out);
    const reasonText = detail?.status === "suspended" ? "suspension" : "injury";
    news.push({
      id: `lineup-change-${change.out}-${stamp}-${position}`,
      type: "lineup-change",
      headline: `${team.name} forced into a lineup change`,
      summary: `${change.outName} misses the match through ${reasonText}. ${change.inName} steps into the XI at ${change.position}.`,
      teams: teamRefs,
      createdAt,
    });
  });

  newInjuries.forEach((injury, position) => {
    const matchesLabel = `${injury.matchesOut} match${injury.matchesOut > 1 ? "es" : ""}`;
    news.push({
      id: `injury-${injury.index}-${stamp}-${position}`,
      type: "injury",
      headline: `${injury.playerName} picks up ${injuryArticle(injury.injuryType)} ${injury.injuryType}`,
      summary: `${team.name}'s ${injury.playerName} suffered ${injuryArticle(injury.injuryType)} ${injury.injuryType} (${injury.severity}) and is expected to miss ${matchesLabel}.`,
      teams: teamRefs,
      createdAt,
    });
  });

  newSuspensions.forEach((suspension, position) => {
    news.push({
      id: `suspension-${suspension.index}-${stamp}-${position}`,
      type: "suspension",
      headline: `${suspension.playerName} suspended for the next match`,
      summary: `${team.name}'s ${suspension.playerName} will serve a one-match ban (${suspension.reason}).`,
      teams: teamRefs,
      createdAt,
    });
  });

  return news;
}

// Computes the manager team's available lineup for the upcoming match, auto-replacing any
// injured/suspended starters. Returns the resolved player lineup, forced changes, and the
// pre-match availability map (used for news + UI).
function resolveAvailableLineup(state, selectedTeam, selectedSquad) {
  const { injuries, suspensions } = getAvailabilityState(state);
  const availabilityMap = buildAvailabilityMap(selectedTeam.code, injuries, suspensions);
  const unavailable = unavailableIndexSet(selectedTeam.code, injuries, suspensions);
  const { startingXI: availableXI, changes } = buildAvailableLineup(
    selectedTeam,
    selectedSquad.startingXI,
    selectedSquad.bench,
    unavailable,
  );
  return {
    availabilityMap,
    lineupChanges: changes,
    lineup: lineupPlayers(selectedTeam, availableXI),
  };
}

// After the manager plays, decrements served injuries/suspensions, records new ones from
// this match, persists the changes, and returns the generated availability news.
function applyManagerAvailability(state, selectedTeam, managerMatch, lineupChanges, availabilityMap, nextResults) {
  if (!managerMatch) return [];

  const { injuries, suspensions, yellows } = getAvailabilityState(state);
  decrementActiveRecords(injuries, suspensions, selectedTeam.code);

  const baseMatch = countManagerMatches(nextResults, selectedTeam.code);
  const newInjuries = injuryRecordsFromMatch(managerMatch, selectedTeam.code, baseMatch);
  injuries.push(...newInjuries);

  const { newSuspensions } = processMatchCards(managerMatch, selectedTeam.code, yellows);
  suspensions.push(...newSuspensions);

  state.injuries = injuries;
  state.suspensions = suspensions;
  state.accumulatedYellows = yellows;
  state.markModified("injuries");
  state.markModified("suspensions");
  state.markModified("accumulatedYellows");

  return buildAvailabilityNews(selectedTeam, lineupChanges, newInjuries, newSuspensions, availabilityMap);
}

// Queues a post-match press conference for the manager and reopens pre-match conferences
// for the next fixture.
function queuePostConference(state, selectedTeam, managerMatch) {
  if (!managerMatch) return;
  const stageLabel = managerMatch.stageName || (managerMatch.group ? `Group ${managerMatch.group} matchday` : "the match");
  const conference = generatePostConference({
    team: selectedTeam,
    match: managerMatch,
    stageLabel,
    fixtureId: managerMatch.fixtureId,
  });
  const isHome = managerMatch.teams.home.code === selectedTeam.code;
  conference.opponentName = isHome ? managerMatch.teams.away.name : managerMatch.teams.home.name;

  state.pendingConference = { ...conference, answered: false };
  state.lastPreConferenceFixtureId = null;
  state.markModified("pendingConference");
}

function squadResponse(team, formation, squad, state) {
  const { injuries, suspensions } = getAvailabilityState(state);
  const availabilityMap = buildAvailabilityMap(team.code, injuries, suspensions);
  const decorated = decorateSquadSelection(team, squad, availabilityMap);
  return {
    team: team.name,
    teamCode: team.code,
    flag: team.flag,
    formation,
    teamOverall: team.overall,
    lineupOverall: decorated.lineupOverall,
    captainIndex: decorated.captainIndex,
    viceCaptainIndex: decorated.viceCaptainIndex,
    availability: availabilitySummary(team, injuries, suspensions),
    players: team.players.map((player, index) => ({
      ...player,
      index,
      availability: availabilityMap.get(index) || { status: "available", label: "Available", matchesOut: 0 },
    })),
    startingXI: decorated.startingXI,
    bench: decorated.bench,
  };
}

export async function getSquad(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  const team = state.selectedTeamCode ? findTeamByCode(state.selectedTeamCode) : null;

  if (!team) {
    return res.status(400).json({ message: "Select a national team first." });
  }

  const formation = plainTactics(state.tactics).formation;
  const squad = resolveSquadSelection(team, state.squad, formation);
  state.squad = squad;
  state.markModified("squad");
  await state.save();

  return res.json(squadResponse(team, formation, squad, state));
}

function parsePlayerRouteId(rawId) {
  if (!rawId) return null;
  const separator = rawId.lastIndexOf("-");
  if (separator <= 0) return null;
  const teamCode = rawId.slice(0, separator).toUpperCase();
  const index = Number(rawId.slice(separator + 1));
  if (!Number.isInteger(index) || index < 0) return null;
  return { teamCode, index };
}

export async function getPlayerProfile(req, res) {
  const parsed = parsePlayerRouteId(req.params.playerId);
  const team = parsed ? findTeamByCode(parsed.teamCode) : null;

  if (!team || !team.players[parsed.index]) {
    return res.status(404).json({ message: "Player not found." });
  }

  const state = await getOrCreateGameState(req.user._id);
  const playerStats = state.playerStats?.players ? state.playerStats : buildTournamentPlayerStats(state.results);
  const completedTournaments = normalizeTournamentHistory(state.tournamentHistory).length;

  const profile = buildPlayerProfile({
    team,
    index: parsed.index,
    results: state.results || [],
    playerStats,
    completedTournaments,
  });

  // Flag captaincy + availability when the player belongs to the manager's selected team.
  if (state.selectedTeamCode === team.code) {
    const squad = resolveSquadSelection(team, state.squad, plainTactics(state.tactics).formation);
    profile.isCaptain = squad.captainIndex === parsed.index;
    profile.isViceCaptain = squad.viceCaptainIndex === parsed.index;
    profile.inStartingXI = squad.startingXI.some((entry) => entry.playerIndex === parsed.index);
    profile.onBench = squad.bench.includes(parsed.index);
    profile.isManagerTeam = true;

    const { injuries, suspensions } = getAvailabilityState(state);
    const map = buildAvailabilityMap(team.code, injuries, suspensions);
    profile.availability = map.get(parsed.index) || { status: "available", label: "Available", matchesOut: 0 };
  } else {
    profile.availability = { status: "available", label: "Available", matchesOut: 0 };
  }

  return res.json({ profile });
}

export async function updateSquad(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  const team = state.selectedTeamCode ? findTeamByCode(state.selectedTeamCode) : null;

  if (!team) {
    return res.status(400).json({ message: "Select a national team first." });
  }

  const formation = plainTactics(state.tactics).formation;
  const squad = buildSquadFromInput(team, formation, req.body.startingXI, req.body.bench, req.body.captainIndex, req.body.viceCaptainIndex);
  state.squad = squad;
  state.markModified("squad");
  await state.save();

  return res.json({ message: "Squad updated.", ...squadResponse(team, formation, squad, state) });
}

export async function autoSquad(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  const team = state.selectedTeamCode ? findTeamByCode(state.selectedTeamCode) : null;

  if (!team) {
    return res.status(400).json({ message: "Select a national team first." });
  }

  const formation = req.body.formation ? normalizeFormation(req.body.formation) : plainTactics(state.tactics).formation;
  const squad = generateSquadSelection(team, formation);

  return res.json({ message: "Suggested Starting XI generated.", ...squadResponse(team, formation, squad, state) });
}

export async function getPressConference(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  const team = state.selectedTeamCode ? findTeamByCode(state.selectedTeamCode) : null;

  if (!team) {
    return res.status(400).json({ message: "Select a national team first." });
  }

  const payload = pressConferencePayload(state, team);

  // Persist a freshly generated pre-match conference so question ids stay stable on submit.
  if (payload.generated && payload.conference) {
    state.pendingConference = { ...payload.conference, answered: false };
    state.lastPreConferenceFixtureId = payload.conference.fixtureId || null;
    state.markModified("pendingConference");
    await state.save();
  }

  return res.json(payload);
}

export async function submitPressConference(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  const team = state.selectedTeamCode ? findTeamByCode(state.selectedTeamCode) : null;

  if (!team) {
    return res.status(400).json({ message: "Select a national team first." });
  }

  const conference = state.pendingConference;
  if (!conference || conference.answered) {
    return res.status(400).json({ message: "There is no active press conference to answer." });
  }

  const answers = req.body.answers && typeof req.body.answers === "object" ? req.body.answers : {};
  const result = applyConferenceAnswers(state.media, normalizeManagerCareer(state.managerCareer), conference, answers);
  const news = buildConferenceNews(team, conference, result, conference.opponentName || null);

  state.media = result.media;
  state.managerCareer = result.career;
  state.news.push(...news);
  const conferenceSummary = {
    id: conference.id,
    type: conference.type,
    stageLabel: conference.stageLabel,
    subtitle: conference.subtitle,
    dominantTone: result.dominantTone,
    reaction: result.reaction,
    effects: result.effects,
    answeredAt: new Date().toISOString(),
  };
  state.pressConferences = [
    ...(Array.isArray(state.pressConferences) ? state.pressConferences : []),
    conferenceSummary,
  ];
  state.pendingConference = null;
  state.markModified("media");
  state.markModified("managerCareer");
  state.markModified("news");
  state.markModified("pressConferences");
  state.markModified("pendingConference");
  await state.save();

  const media = normalizeMedia(state.media);
  return res.json({
    message: "Press conference complete.",
    media: { ...media, trends: mediaTrends(media) },
    effects: result.effects,
    reaction: result.reaction,
    dominantTone: result.dominantTone,
    history: [...state.pressConferences].slice(-6).reverse(),
    news,
    dashboard: buildDashboardPayload(state),
  });
}

export async function getTactics(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  return res.json({ tactics: plainTactics(state.tactics) });
}

export async function updateTactics(req, res) {
  const state = await getOrCreateGameState(req.user._id);
  const previousTactics = plainTactics(state.tactics);
  const nextTactics = { ...previousTactics, ...req.body };

  Object.entries(ALLOWED_TACTICS).forEach(([field, allowedValues]) => {
    if (!allowedValues.includes(nextTactics[field])) {
      throw new Error(`Invalid ${field}: ${nextTactics[field]}`);
    }
  });

  state.tactics = nextTactics;

  // Applying a new formation regenerates a default Starting XI/bench for that shape so
  // the saved squad always matches the active formation's slots.
  const team = state.selectedTeamCode ? findTeamByCode(state.selectedTeamCode) : null;
  if (team && (nextTactics.formation !== previousTactics.formation || !state.squad)) {
    state.squad = generateSquadSelection(team, nextTactics.formation);
    state.markModified("squad");
  }

  await state.save();

  return res.json({
    message: "Tactics updated.",
    tactics: plainTactics(state.tactics),
    squad: team ? squadResponse(team, nextTactics.formation, resolveSquadSelection(team, state.squad, nextTactics.formation), state) : null,
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
  const selectedSquad = resolveSquadSelection(selectedTeam, state.squad, userTactics.formation);
  state.squad = selectedSquad;
  state.markModified("squad");
  // Auto-replace injured/suspended starters before the match is played.
  const { availabilityMap, lineupChanges, lineup: userLineup } = resolveAvailableLineup(state, selectedTeam, selectedSquad);
  // Subtle media/morale modifier shaped by press-conference answers.
  const userModifier = mediaMatchModifier(getMediaState(state));

  if (!globalMatchday) {
    const tournamentBefore = buildTournamentSnapshot(selectedTeam.code, state.results);
    const nextKnockoutRound = tournamentBefore.nextKnockoutRound;

    if (!nextKnockoutRound?.fixtures?.length) {
      return res.status(400).json({
        message: tournamentBefore.tournamentComplete ? "The tournament is complete." : "No playable knockout fixtures are ready.",
      });
    }

    const matches = nextKnockoutRound.fixtures.map((fixture, index) =>
      createKnockoutFixtureResult(fixture, selectedTeam.code, userTactics, `${state.results.length}-${index}`, playedAt, userLineup, userModifier),
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
    const availabilityNews = applyManagerAvailability(state, selectedTeam, managerMatch, lineupChanges, availabilityMap, nextResults);
    queuePostConference(state, selectedTeam, managerMatch);
    const completionNews = archiveTournamentIfComplete(state, tournamentAfter, awards, selectedTeam);
    const news = [
      ...buildKnockoutNews(matches, managerMatch, report, tournamentAfter, selectedTeam.code, nextKnockoutRound.stageName),
      ...availabilityNews,
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
      lineupChanges,
      tournament: { ...tournamentAfter, playerStats, awards },
      dashboard: buildDashboardPayload(state),
    });
  }

  const matchdayFixtures = getMatchdayFixtures(globalMatchday, state.results);
  if (!matchdayFixtures.length) {
    return res.status(400).json({ message: "This matchday has already been played." });
  }

  const matches = matchdayFixtures.map((fixture, index) =>
    createFixtureResult(fixture, selectedTeam.code, userTactics, `${state.results.length}-${index}`, playedAt, userLineup, userModifier),
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
  const availabilityNews = applyManagerAvailability(state, selectedTeam, managerMatch, lineupChanges, availabilityMap, nextResults);
  queuePostConference(state, selectedTeam, managerMatch);
  const news = [...buildMatchdayNews(matches, managerMatch, report, tournamentAfter, selectedTeam.code), ...availabilityNews];

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
    lineupChanges,
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
