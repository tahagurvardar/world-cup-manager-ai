const DEFAULT_TACTICS = {
  formation: "4-3-3",
  mentality: "balanced",
  pressing: "medium",
  tempo: "normal",
  defensiveLine: "medium",
};

const FORMATION_BALANCE = {
  "4-3-3": { attack: 2, midfield: 1, defense: 0 },
  "4-2-3-1": { attack: 1, midfield: 2, defense: 1 },
  "3-5-2": { attack: 1, midfield: 3, defense: -1 },
  "4-4-2": { attack: 0, midfield: 0, defense: 1 },
  "5-3-2": { attack: -1, midfield: 0, defense: 3 },
};

const MENTALITY = {
  defensive: { attack: -2, defense: 3, possession: -3 },
  balanced: { attack: 0, defense: 0, possession: 0 },
  attacking: { attack: 3, defense: -2, possession: 3 },
};

const PRESSING = {
  low: { attack: -1, defense: 1, stamina: 2, fouls: -1 },
  medium: { attack: 0, defense: 0, stamina: 0, fouls: 0 },
  high: { attack: 2, defense: -1, stamina: -3, fouls: 2 },
};

const TEMPO = {
  slow: { attack: -1, possession: 4, variance: -0.08 },
  normal: { attack: 0, possession: 0, variance: 0 },
  fast: { attack: 2, possession: -2, variance: 0.12 },
};

const DEFENSIVE_LINE = {
  low: { defense: 2, attack: -1, possession: -2 },
  medium: { defense: 0, attack: 0, possession: 0 },
  high: { defense: -1, attack: 1, possession: 2 },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashString(input) {
  let hash = 1779033703 ^ input.length;
  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function createSeededRandom(seed) {
  let value = hashString(seed);
  return function random() {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function normalizeTactics(tactics) {
  return { ...DEFAULT_TACTICS, ...tactics };
}

function topPlayers(team) {
  return [...team.players].sort((a, b) => b.overall - a.overall).slice(0, 11);
}

function squadProfile(team) {
  const players = topPlayers(team);

  return {
    overall: average(players.map((player) => player.overall)),
    form: average(players.map((player) => player.form)),
    morale: average(players.map((player) => player.morale)),
    stamina: average(players.map((player) => player.stamina)),
    pace: average(players.map((player) => player.pace)),
    shooting: average(players.map((player) => player.shooting)),
    passing: average(players.map((player) => player.passing)),
    defending: average(players.map((player) => player.defending)),
    physical: average(players.map((player) => player.physical)),
  };
}

function tacticalProfile(tactics, opponentTactics) {
  const own = normalizeTactics(tactics);
  const opponent = normalizeTactics(opponentTactics);
  const shape = FORMATION_BALANCE[own.formation];
  const mentality = MENTALITY[own.mentality];
  const pressing = PRESSING[own.pressing];
  const tempo = TEMPO[own.tempo];
  const line = DEFENSIVE_LINE[own.defensiveLine];
  let matchup = 0;

  if (own.pressing === "high" && opponent.tempo === "slow") matchup += 1.5;
  if (own.defensiveLine === "high" && opponent.tempo === "fast") matchup -= 1.5;
  if (own.formation === "3-5-2" && opponent.formation === "4-4-2") matchup += 1;
  if (own.formation === "5-3-2" && opponent.mentality === "attacking") matchup += 1.2;
  if (own.formation === "4-3-3" && opponent.formation === "5-3-2") matchup -= 0.8;

  return {
    attack: shape.attack + mentality.attack + pressing.attack + tempo.attack + line.attack + matchup,
    defense: shape.defense + mentality.defense + pressing.defense + line.defense + matchup * 0.5,
    possession: mentality.possession + tempo.possession + line.possession,
    stamina: pressing.stamina,
    fouls: pressing.fouls,
    variance: tempo.variance,
  };
}

function calculatePower(team, tactics, opponentTactics) {
  const squad = squadProfile(team);
  const tactical = tacticalProfile(tactics, opponentTactics);
  const base =
    team.overall * 0.45 +
    squad.overall * 0.25 +
    squad.form * 0.11 +
    squad.morale * 0.08 +
    squad.stamina * 0.05 +
    squad.physical * 0.03 +
    squad.passing * 0.03;

  return {
    attack: base + squad.shooting * 0.08 + squad.pace * 0.05 + tactical.attack,
    defense: base + squad.defending * 0.09 + squad.physical * 0.04 + tactical.defense,
    possession: 50 + (squad.passing - 75) * 0.25 + tactical.possession,
    fouls: 9 + tactical.fouls + (100 - squad.stamina) * 0.04,
    variance: tactical.variance,
  };
}

function goalsFromXg(xg, random) {
  const conservativeBase = Math.floor(xg * 0.72);
  const fraction = xg * 0.72 - conservativeBase;
  let goals = conservativeBase;

  if (random() < fraction) goals += 1;
  if (xg > 1.4 && random() < xg / 9) goals += 1;
  if (xg > 2.4 && random() < xg / 12) goals += 1;

  return clamp(goals, 0, 6);
}

function pickPlayer(team, positions, random) {
  const candidates = team.players
    .filter((player) => positions.includes(player.position))
    .sort((a, b) => b.overall + b.form - (a.overall + a.form));
  const pool = candidates.length ? candidates.slice(0, 6) : topPlayers(team);
  return pool[Math.floor(random() * pool.length)];
}

function generateGoalEvents(team, goals, random) {
  const events = [];
  for (let index = 0; index < goals; index += 1) {
    const scorer = pickPlayer(team, ["ST", "LW", "RW", "AM", "CM"], random);
    const assist = pickPlayer(team, ["AM", "CM", "RW", "LW", "RB", "LB"], random);
    const minute = clamp(Math.round(6 + random() * 86), 1, 90);

    events.push({
      minute,
      type: "goal",
      team: team.name,
      player: scorer.name,
      description: `${scorer.name} scores for ${team.name} after a move created by ${assist.name}.`,
    });
  }
  return events;
}

function generateCardEvents(team, cardCount, random) {
  const events = [];
  for (let index = 0; index < cardCount; index += 1) {
    const player = pickPlayer(team, ["CB", "DM", "RB", "LB", "CM"], random);
    const minute = clamp(Math.round(12 + random() * 76), 1, 90);
    events.push({
      minute,
      type: "yellow-card",
      team: team.name,
      player: player.name,
      description: `${player.name} is booked after stopping a transition.`,
    });
  }
  return events;
}

function chooseManOfTheMatch(homeTeam, awayTeam, homeGoals, awayGoals, random) {
  const winningTeam = homeGoals >= awayGoals ? homeTeam : awayTeam;
  const tied = homeGoals === awayGoals;
  const candidateTeam = tied && random() > 0.5 ? awayTeam : winningTeam;
  const preferredPositions = tied ? ["GK", "CB", "DM", "CM"] : ["ST", "AM", "LW", "RW", "CM"];
  const player = pickPlayer(candidateTeam, preferredPositions, random);

  return {
    name: player.name,
    team: candidateTeam.name,
    rating: Number(clamp(player.overall / 10 + 0.7 + random() * 1.2, 6.8, 9.8).toFixed(1)),
  };
}

function getWinnerFromScore(homeTeam, awayTeam, score) {
  if (score.home > score.away) return { winner: homeTeam, loser: awayTeam };
  if (score.away > score.home) return { winner: awayTeam, loser: homeTeam };
  return { winner: null, loser: null };
}

function buildPenaltyShootout(homeTeam, awayTeam, random) {
  let homePenalties = 3 + Math.floor(random() * 3);
  let awayPenalties = 3 + Math.floor(random() * 3);

  if (homePenalties === awayPenalties) {
    if (homeTeam.overall + random() * 8 >= awayTeam.overall + random() * 8) {
      homePenalties += 1;
    } else {
      awayPenalties += 1;
    }
  }

  return {
    home: homePenalties,
    away: awayPenalties,
  };
}

export function getDefaultOpponentTactics(team) {
  if (team.overall >= 86) {
    return {
      formation: "4-3-3",
      mentality: "attacking",
      pressing: "high",
      tempo: "fast",
      defensiveLine: "high",
    };
  }

  if (team.style.includes("counter") || team.overall <= 80) {
    return {
      formation: "5-3-2",
      mentality: "defensive",
      pressing: "medium",
      tempo: "fast",
      defensiveLine: "low",
    };
  }

  return DEFAULT_TACTICS;
}

export function simulateMatch(homeTeam, awayTeam, homeTactics, awayTactics, seed = "friendly") {
  const random = createSeededRandom(`${seed}-${homeTeam.code}-${awayTeam.code}`);
  const homePower = calculatePower(homeTeam, homeTactics, awayTactics);
  const awayPower = calculatePower(awayTeam, awayTactics, homeTactics);
  const homeAdvantage = 0.16;
  const homeXg = clamp(
    1.1 + (homePower.attack - awayPower.defense) / 16 + homeAdvantage + (random() - 0.5) * (0.6 + homePower.variance),
    0.2,
    4.2,
  );
  const awayXg = clamp(
    1.0 + (awayPower.attack - homePower.defense) / 16 + (random() - 0.5) * (0.6 + awayPower.variance),
    0.2,
    4.2,
  );
  const homeGoals = goalsFromXg(homeXg, random);
  const awayGoals = goalsFromXg(awayXg, random);
  const rawPossession = 50 + (homePower.possession - awayPower.possession) * 0.55 + (random() - 0.5) * 8;
  const homePossession = Math.round(clamp(rawPossession, 34, 66));
  const awayPossession = 100 - homePossession;
  const homeShots = Math.round(clamp(homeXg * 5.5 + 3 + random() * 5, 3, 24));
  const awayShots = Math.round(clamp(awayXg * 5.5 + 3 + random() * 5, 3, 24));
  const homeShotsOnTarget = Math.min(homeShots, Math.max(homeGoals, Math.round(homeShots * (0.28 + random() * 0.24))));
  const awayShotsOnTarget = Math.min(awayShots, Math.max(awayGoals, Math.round(awayShots * (0.28 + random() * 0.24))));
  const homeFouls = Math.round(clamp(homePower.fouls + random() * 5, 6, 20));
  const awayFouls = Math.round(clamp(awayPower.fouls + random() * 5, 6, 20));
  const homeYellowCards = Math.round(clamp((homeFouls - 6) / 5 + random(), 0, 5));
  const awayYellowCards = Math.round(clamp((awayFouls - 6) / 5 + random(), 0, 5));
  const events = [
    { minute: 1, type: "kickoff", description: `${homeTeam.name} kick off against ${awayTeam.name}.` },
    ...generateGoalEvents(homeTeam, homeGoals, random),
    ...generateGoalEvents(awayTeam, awayGoals, random),
    ...generateCardEvents(homeTeam, homeYellowCards, random),
    ...generateCardEvents(awayTeam, awayYellowCards, random),
    {
      minute: 90,
      type: "full-time",
      description: `Full time: ${homeTeam.name} ${homeGoals}-${awayGoals} ${awayTeam.name}.`,
    },
  ].sort((a, b) => a.minute - b.minute);

  return {
    score: {
      home: homeGoals,
      away: awayGoals,
    },
    teams: {
      home: { code: homeTeam.code, name: homeTeam.name },
      away: { code: awayTeam.code, name: awayTeam.name },
    },
    stats: {
      possession: { home: homePossession, away: awayPossession },
      xG: { home: Number(homeXg.toFixed(2)), away: Number(awayXg.toFixed(2)) },
      shots: { home: homeShots, away: awayShots },
      shotsOnTarget: { home: homeShotsOnTarget, away: awayShotsOnTarget },
      fouls: { home: homeFouls, away: awayFouls },
      yellowCards: { home: homeYellowCards, away: awayYellowCards },
    },
    manOfTheMatch: chooseManOfTheMatch(homeTeam, awayTeam, homeGoals, awayGoals, random),
    events,
  };
}

export function simulateKnockoutMatch(homeTeam, awayTeam, homeTactics, awayTactics, seed = "knockout", stage = "Knockout") {
  const match = simulateMatch(homeTeam, awayTeam, homeTactics, awayTactics, seed);
  const random = createSeededRandom(`${seed}-${stage}-resolution`);
  const normalTimeScore = { ...match.score };
  let resolution = "normal-time";
  let extraTime = null;
  let penalties = null;
  let { winner, loser } = getWinnerFromScore(homeTeam, awayTeam, match.score);
  const events = [...match.events];

  if (!winner) {
    resolution = "extra-time";
    extraTime = { home: 0, away: 0 };

    if (random() < 0.52) {
      if (homeTeam.overall + random() * 10 >= awayTeam.overall + random() * 10) {
        extraTime.home = 1;
        match.score.home += 1;
        events.push({
          minute: 104 + Math.floor(random() * 16),
          type: "extra-time-goal",
          team: homeTeam.name,
          description: `${homeTeam.name} find the breakthrough in extra time.`,
        });
      } else {
        extraTime.away = 1;
        match.score.away += 1;
        events.push({
          minute: 104 + Math.floor(random() * 16),
          type: "extra-time-goal",
          team: awayTeam.name,
          description: `${awayTeam.name} find the breakthrough in extra time.`,
        });
      }
    }

    ({ winner, loser } = getWinnerFromScore(homeTeam, awayTeam, match.score));

    if (!winner) {
      resolution = "penalties";
      penalties = buildPenaltyShootout(homeTeam, awayTeam, random);
      winner = penalties.home > penalties.away ? homeTeam : awayTeam;
      loser = penalties.home > penalties.away ? awayTeam : homeTeam;
      events.push({
        minute: 120,
        type: "penalties",
        team: winner.name,
        description: `${winner.name} win ${penalties.home}-${penalties.away} on penalties.`,
      });
    }
  }

  events.push({
    minute: resolution === "normal-time" ? 90 : 120,
    type: "winner-confirmed",
    team: winner.name,
    description: `${winner.name} advance from the ${stage}.`,
  });

  return {
    ...match,
    events: events.sort((a, b) => a.minute - b.minute),
    knockout: {
      stage,
      resolution,
      normalTimeScore,
      extraTime,
      penalties,
      winnerTeam: { code: winner.code, name: winner.name },
      loserTeam: { code: loser.code, name: loser.name },
    },
  };
}
