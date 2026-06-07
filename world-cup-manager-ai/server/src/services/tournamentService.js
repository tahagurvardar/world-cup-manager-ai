import { fixtures, knockoutTemplate } from "../data/groups.js";
import { groupOrder, teams } from "../data/teams.js";
import { enrichFixtureAtmosphere } from "../data/atmosphere.js";

export const knockoutRounds = [
  { key: "roundOf32", label: "Round of 32", prefix: "R32" },
  { key: "roundOf16", label: "Round of 16", prefix: "R16" },
  { key: "quarterFinal", label: "Quarter Final", prefix: "QF" },
  { key: "semiFinal", label: "Semi Final", prefix: "SF" },
  { key: "thirdPlace", label: "Third Place Match", prefix: "TP" },
  { key: "final", label: "Final", prefix: "F" },
];

const knockoutRoundByKey = knockoutRounds.reduce(
  (collection, round) => ({
    ...collection,
    [round.key]: round,
  }),
  {},
);

const advancementMap = {
  roundOf16: { previous: "roundOf32", prefix: "R16", previousPrefix: "R32", count: 8 },
  quarterFinal: { previous: "roundOf16", prefix: "QF", previousPrefix: "R16", count: 4 },
  semiFinal: { previous: "quarterFinal", prefix: "SF", previousPrefix: "QF", count: 2 },
};

function emptyRow(team) {
  return {
    teamCode: team.code,
    teamName: team.name,
    flag: team.flag,
    overall: team.overall,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function getTeam(code) {
  return teams.find((team) => team.code === code);
}

function getPlayedFixtureIds(playedResults = []) {
  return new Set(playedResults.map((result) => result.fixtureId));
}

function getResultByFixtureId(playedResults, fixtureId) {
  return playedResults.find((result) => result.fixtureId === fixtureId);
}

function getWinnerCode(result) {
  if (!result) return null;
  if (result.knockout?.winnerTeam?.code) return result.knockout.winnerTeam.code;
  if (result.score.home > result.score.away) return result.teams.home.code;
  if (result.score.away > result.score.home) return result.teams.away.code;
  return null;
}

function getLoserCode(result) {
  if (!result) return null;
  if (result.knockout?.loserTeam?.code) return result.knockout.loserTeam.code;
  if (result.score.home > result.score.away) return result.teams.away.code;
  if (result.score.away > result.score.home) return result.teams.home.code;
  return null;
}

function withTeamFields(match, homeTeamCode, awayTeamCode, playedResults) {
  const home = getTeam(homeTeamCode);
  const away = getTeam(awayTeamCode);
  const result = getResultByFixtureId(playedResults, match.id);
  const winnerCode = getWinnerCode(result);
  const loserCode = getLoserCode(result);

  return enrichFixtureAtmosphere({
    ...match,
    homeTeamCode,
    awayTeamCode,
    homeTeam: home?.name || match.homeSeed,
    awayTeam: away?.name || match.awaySeed,
    homeFlag: home?.flag || null,
    awayFlag: away?.flag || null,
    stage: match.stage,
    stageName: match.stageName,
    status: result ? "played" : "ready",
    score: result?.score || null,
    knockout: result?.knockout || null,
    winnerTeamCode: winnerCode,
    loserTeamCode: loserCode,
    winnerTeam: winnerCode ? getTeam(winnerCode)?.name : null,
    loserTeam: loserCode ? getTeam(loserCode)?.name : null,
  });
}

function placeholderMatch(id, stage, stageName, homeSeed, awaySeed) {
  return enrichFixtureAtmosphere({
    id,
    stage,
    stageName,
    homeSeed,
    awaySeed,
    status: "locked",
  });
}

export function getRoundLabel(stage) {
  return knockoutRoundByKey[stage]?.label || stage;
}

export function sortRows(rows) {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (b.overall !== a.overall) return b.overall - a.overall;
    return a.teamName.localeCompare(b.teamName);
  });
}

export function getNextGlobalMatchday(playedResults = []) {
  const playedFixtureIds = getPlayedFixtureIds(playedResults);
  const nextFixture = fixtures.find((fixture) => !playedFixtureIds.has(fixture.id));
  return nextFixture?.globalMatchday || null;
}

export function getMatchdayFixtures(globalMatchday, playedResults = []) {
  const playedFixtureIds = getPlayedFixtureIds(playedResults);
  return fixtures.filter((fixture) => fixture.globalMatchday === globalMatchday && !playedFixtureIds.has(fixture.id));
}

export function getNextGroupFixture(teamCode, playedResults = []) {
  const playedFixtureIds = getPlayedFixtureIds(playedResults);
  return fixtures.find(
    (fixture) =>
      !playedFixtureIds.has(fixture.id) &&
      (fixture.homeTeamCode === teamCode || fixture.awayTeamCode === teamCode),
  );
}

export function buildPointsTable(playedResults = [], allTeams = teams) {
  const tableByGroup = allTeams.reduce((collection, team) => {
    if (!collection[team.group]) collection[team.group] = {};
    collection[team.group][team.code] = emptyRow(team);
    return collection;
  }, {});

  playedResults
    .filter((result) => result.stage === "group")
    .forEach((result) => {
      const home = tableByGroup[result.group]?.[result.teams.home.code];
      const away = tableByGroup[result.group]?.[result.teams.away.code];
      if (!home || !away) return;

      const homeGoals = result.score.home;
      const awayGoals = result.score.away;

      home.played += 1;
      away.played += 1;
      home.goalsFor += homeGoals;
      home.goalsAgainst += awayGoals;
      away.goalsFor += awayGoals;
      away.goalsAgainst += homeGoals;
      home.goalDifference = home.goalsFor - home.goalsAgainst;
      away.goalDifference = away.goalsFor - away.goalsAgainst;

      if (homeGoals > awayGoals) {
        home.wins += 1;
        home.points += 3;
        away.losses += 1;
      } else if (awayGoals > homeGoals) {
        away.wins += 1;
        away.points += 3;
        home.losses += 1;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += 1;
        away.points += 1;
      }
    });

  return groupOrder.map((group) => ({
    group,
    rows: sortRows(Object.values(tableByGroup[group] || {})),
  }));
}

export function buildThirdPlaceRanking(table) {
  return sortRows(
    table
      .map((group) => {
        const row = group.rows[2];
        return row ? { ...row, group: group.group } : null;
      })
      .filter(Boolean),
  ).map((row, index) => ({
    ...row,
    rank: index + 1,
    qualifies: index < 8,
  }));
}

export function buildQualifiedTeams(table) {
  const winners = table.map((group) => ({
    ...group.rows[0],
    group: group.group,
    seed: `${group.group}1`,
    qualification: `Winner Group ${group.group}`,
  }));
  const runnersUp = table.map((group) => ({
    ...group.rows[1],
    group: group.group,
    seed: `${group.group}2`,
    qualification: `Runner-up Group ${group.group}`,
  }));
  const thirdPlaced = buildThirdPlaceRanking(table)
    .slice(0, 8)
    .map((row) => ({
      ...row,
      seed: `${row.group}3`,
      qualification: `Best third-place #${row.rank}`,
    }));

  return [...winners, ...runnersUp, ...thirdPlaced];
}

function buildRoundOf32(qualifiedTeams, playedResults) {
  if (qualifiedTeams.length < 32) {
    return knockoutTemplate.roundOf32.map((match) => ({
      ...match,
      stage: "roundOf32",
      stageName: "Round of 32",
    }));
  }

  return Array.from({ length: 16 }, (_, index) => {
    const home = qualifiedTeams[index];
    const away = qualifiedTeams[qualifiedTeams.length - 1 - index];

    return withTeamFields(
      {
        id: `R32-${index + 1}`,
        stage: "roundOf32",
        stageName: "Round of 32",
        homeSeed: home.seed,
        awaySeed: away.seed,
      },
      home.teamCode,
      away.teamCode,
      playedResults,
    );
  });
}

function buildAdvancementRound(stage, previousRound, playedResults) {
  const config = advancementMap[stage];
  const stageName = getRoundLabel(stage);

  return Array.from({ length: config.count }, (_, index) => {
    const homeSource = previousRound[index * 2];
    const awaySource = previousRound[index * 2 + 1];
    const homeTeamCode = homeSource?.winnerTeamCode;
    const awayTeamCode = awaySource?.winnerTeamCode;
    const id = `${config.prefix}-${index + 1}`;

    if (!homeTeamCode || !awayTeamCode) {
      return placeholderMatch(
        id,
        stage,
        stageName,
        `Winner ${config.previousPrefix}-${index * 2 + 1}`,
        `Winner ${config.previousPrefix}-${index * 2 + 2}`,
      );
    }

    return withTeamFields(
      {
        id,
        stage,
        stageName,
        homeSeed: `Winner ${homeSource.id}`,
        awaySeed: `Winner ${awaySource.id}`,
      },
      homeTeamCode,
      awayTeamCode,
      playedResults,
    );
  });
}

function buildFinalMatch(semiFinals, playedResults) {
  const homeTeamCode = semiFinals[0]?.winnerTeamCode;
  const awayTeamCode = semiFinals[1]?.winnerTeamCode;

  if (!homeTeamCode || !awayTeamCode) {
    return [placeholderMatch("F-1", "final", "Final", "Winner SF-1", "Winner SF-2")];
  }

  return [
    withTeamFields(
      {
        id: "F-1",
        stage: "final",
        stageName: "Final",
        homeSeed: "Winner SF-1",
        awaySeed: "Winner SF-2",
      },
      homeTeamCode,
      awayTeamCode,
      playedResults,
    ),
  ];
}

function buildThirdPlaceMatch(semiFinals, playedResults) {
  const homeTeamCode = semiFinals[0]?.loserTeamCode;
  const awayTeamCode = semiFinals[1]?.loserTeamCode;

  if (!homeTeamCode || !awayTeamCode) {
    return [placeholderMatch("TP-1", "thirdPlace", "Third Place Match", "Loser SF-1", "Loser SF-2")];
  }

  return [
    withTeamFields(
      {
        id: "TP-1",
        stage: "thirdPlace",
        stageName: "Third Place Match",
        homeSeed: "Loser SF-1",
        awaySeed: "Loser SF-2",
      },
      homeTeamCode,
      awayTeamCode,
      playedResults,
    ),
  ];
}

export function buildKnockout(table, groupStageComplete, playedResults = []) {
  if (!groupStageComplete) {
    return {
      ...knockoutTemplate,
      thirdPlace: [placeholderMatch("TP-1", "thirdPlace", "Third Place Match", "Loser SF-1", "Loser SF-2")],
    };
  }

  const qualifiedTeams = buildQualifiedTeams(table);
  const roundOf32 = buildRoundOf32(qualifiedTeams, playedResults);
  const roundOf16 = buildAdvancementRound("roundOf16", roundOf32, playedResults);
  const quarterFinal = buildAdvancementRound("quarterFinal", roundOf16, playedResults);
  const semiFinal = buildAdvancementRound("semiFinal", quarterFinal, playedResults);
  const thirdPlace = buildThirdPlaceMatch(semiFinal, playedResults);
  const final = buildFinalMatch(semiFinal, playedResults);

  return {
    roundOf32,
    roundOf16,
    quarterFinal,
    semiFinal,
    thirdPlace,
    final,
  };
}

export function getNextKnockoutRound(knockout) {
  for (const round of knockoutRounds) {
    const fixturesForRound = knockout[round.key] || [];
    const readyFixtures = fixturesForRound.filter((fixture) => fixture.status === "ready");
    if (readyFixtures.length) {
      return {
        stage: round.key,
        stageName: round.label,
        fixtures: readyFixtures,
      };
    }
  }

  return null;
}

export function getNextFixture(teamCode, playedResults = []) {
  const groupFixture = getNextGroupFixture(teamCode, playedResults);
  if (groupFixture) return groupFixture;

  const snapshot = buildTournamentSnapshot(teamCode, playedResults);
  return snapshot.nextKnockoutRound?.fixtures.find(
    (fixture) => fixture.homeTeamCode === teamCode || fixture.awayTeamCode === teamCode,
  ) || null;
}

function getTeamKnockoutState(teamCode, knockout, groupStageComplete, qualifiedTeams) {
  if (!groupStageComplete || !teamCode) {
    return {
      alive: false,
      eliminated: false,
      nextFixture: null,
      routeToFinal: ["Group Stage", "Round of 32", "Round of 16", "Quarter Final", "Semi Final", "Final"],
    };
  }

  const qualified = qualifiedTeams.some((team) => team.teamCode === teamCode);
  if (!qualified) {
    return {
      alive: false,
      eliminated: true,
      nextFixture: null,
      routeToFinal: ["Eliminated in Group Stage"],
    };
  }

  for (const round of knockoutRounds) {
    const fixturesForRound = knockout[round.key] || [];
    const teamFixture = fixturesForRound.find(
      (fixture) => fixture.homeTeamCode === teamCode || fixture.awayTeamCode === teamCode,
    );

    if (teamFixture?.status === "ready") {
      const remainingRounds = knockoutRounds
        .slice(knockoutRounds.findIndex((item) => item.key === round.key))
        .filter((item) => item.key !== "thirdPlace")
        .map((item) => item.label);

      return {
        alive: true,
        eliminated: false,
        nextFixture: teamFixture,
        routeToFinal: remainingRounds,
      };
    }

    if (teamFixture?.status === "played" && teamFixture.winnerTeamCode !== teamCode) {
      const thirdPlaceFixture = knockout.thirdPlace?.find(
        (fixture) =>
          (fixture.homeTeamCode === teamCode || fixture.awayTeamCode === teamCode),
      );

      if (round.key === "final") {
        return {
          alive: false,
          eliminated: false,
          runnerUp: true,
          nextFixture: null,
          routeToFinal: ["World Cup Runners-up"],
        };
      }

      if (thirdPlaceFixture?.status === "ready") {
        return {
          alive: true,
          eliminated: false,
          nextFixture: thirdPlaceFixture,
          routeToFinal: ["Third Place Match"],
        };
      }

      if (thirdPlaceFixture?.status === "played") {
        const thirdPlace = thirdPlaceFixture.winnerTeamCode === teamCode;

        return {
          alive: false,
          eliminated: false,
          thirdPlace,
          fourthPlace: !thirdPlace,
          nextFixture: null,
          routeToFinal: [thirdPlace ? "Third place finish" : "Fourth place finish"],
        };
      }

      return {
        alive: false,
        eliminated: true,
        nextFixture: null,
        routeToFinal: [`Eliminated in ${round.label}`],
      };
    }
  }

  const finalResult = knockout.final?.[0];
  if (finalResult?.status === "played" && finalResult.winnerTeamCode === teamCode) {
    return {
      alive: false,
      eliminated: false,
      champion: true,
      nextFixture: null,
      routeToFinal: ["World Cup Champions"],
    };
  }

  return {
    alive: false,
    eliminated: true,
    nextFixture: null,
    routeToFinal: ["Tournament complete"],
  };
}

function getSelectedTeamStatus(teamCode, table, groupStageComplete, qualifiedTeams, knockout) {
  if (!teamCode) return null;

  const group = table.find((item) => item.rows.some((row) => row.teamCode === teamCode));
  if (!group) return null;

  const rowIndex = group.rows.findIndex((row) => row.teamCode === teamCode);
  const position = rowIndex + 1;

  if (groupStageComplete) {
    const knockoutState = getTeamKnockoutState(teamCode, knockout, groupStageComplete, qualifiedTeams);
    const qualified = qualifiedTeams.some((team) => team.teamCode === teamCode);

    return {
      group: group.group,
      groupPosition: position,
      qualificationStatus: knockoutState.champion
        ? "World Cup Champions"
        : knockoutState.runnerUp
          ? "World Cup Runners-up"
          : knockoutState.thirdPlace
            ? "Third place finish"
            : knockoutState.fourthPlace
              ? "Fourth place finish"
              : knockoutState.nextFixture
                ? `Alive - ${knockoutState.nextFixture.stageName}`
                : qualified && knockoutState.routeToFinal?.[0]
                  ? knockoutState.routeToFinal[0]
                  : "Eliminated in group stage",
      knockoutState,
    };
  }

  return {
    group: group.group,
    groupPosition: position,
    qualificationStatus:
      position <= 2
        ? "Currently in automatic qualification place"
        : position === 3
          ? "Currently in best third-place race"
          : "Needs results to climb into qualification range",
    knockoutState: null,
  };
}

function getTournamentComplete(knockout) {
  return knockout.final?.[0]?.status === "played" && knockout.thirdPlace?.[0]?.status === "played";
}

export function buildTournamentSnapshot(teamCode, playedResults = []) {
  const table = buildPointsTable(playedResults);
  const groupFixturesPlayed = playedResults.filter((result) => result.stage === "group").length;
  const nextGlobalMatchday = getNextGlobalMatchday(playedResults);
  const groupStageComplete = groupFixturesPlayed >= fixtures.length;
  const thirdPlaceRanking = buildThirdPlaceRanking(table);
  const qualifiedTeams = groupStageComplete ? buildQualifiedTeams(table) : [];
  const knockout = buildKnockout(table, groupStageComplete, playedResults);
  const nextKnockoutRound = groupStageComplete ? getNextKnockoutRound(knockout) : null;
  const selectedTeamStatus = getSelectedTeamStatus(teamCode, table, groupStageComplete, qualifiedTeams, knockout);
  const nextFixture = nextGlobalMatchday
    ? getNextGroupFixture(teamCode, playedResults)
    : selectedTeamStatus?.knockoutState?.nextFixture || null;
  const tournamentComplete = groupStageComplete && getTournamentComplete(knockout);

  return {
    currentStage: tournamentComplete
      ? "Tournament Complete"
      : nextGlobalMatchday
        ? `Group Stage - Matchday ${nextGlobalMatchday}`
        : nextKnockoutRound?.stageName || "Tournament Complete",
    nextGlobalMatchday,
    groupStageComplete,
    tournamentComplete,
    groupStage: {
      playedFixtures: groupFixturesPlayed,
      totalFixtures: fixtures.length,
      playedMatchdays: nextGlobalMatchday ? nextGlobalMatchday - 1 : 3,
      totalMatchdays: 3,
      fixtures,
      table,
    },
    nextFixture,
    nextKnockoutRound,
    thirdPlaceRanking,
    qualifiedTeams,
    selectedTeamStatus,
    routeToFinal: selectedTeamStatus?.knockoutState?.routeToFinal || [
      "Group Stage",
      "Round of 32",
      "Round of 16",
      "Quarter Final",
      "Semi Final",
      "Final",
    ],
    knockout,
    progressText: nextFixture
      ? nextFixture.stage === "group"
        ? `Global Matchday ${nextFixture.globalMatchday} - Group ${nextFixture.group}`
        : `${nextFixture.stageName} vs ${nextFixture.homeTeamCode === teamCode ? nextFixture.awayTeam : nextFixture.homeTeam}`
      : tournamentComplete
        ? "Tournament complete"
        : groupStageComplete
          ? nextKnockoutRound
            ? `${nextKnockoutRound.stageName} ready`
            : "Knockout bracket ready"
          : "Awaiting tournament fixtures",
  };
}
