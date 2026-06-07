// Builds a complete Football-Manager-style player profile for any team/player index.
// Several FM/FIFA attributes (dribbling, strength, composure, leadership, vision) and
// career totals (caps, international goals, tournament appearances) are not stored on the
// generated player records, so they are derived deterministically from a seed. This keeps
// every profile stable across requests while staying consistent with the project's
// fictional, generated player data.

const ATT_POS = new Set(["ST", "LW", "RW"]);
const MID_POS = new Set(["DM", "CM", "AM"]);

const FOOTS = ["Right", "Right", "Right", "Left", "Either"];

function clamp(value, min = 1, max = 99) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function hashValue(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Deterministic signed noise in [-spread, spread] for a given seed string.
function noise(seed, spread) {
  return (hashValue(seed) % (spread * 2 + 1)) - spread;
}

function simPlayerId(teamCode, index, player) {
  return `${teamCode}:${index}:${player.name}`;
}

function deriveAttributes(player, seed) {
  // Technical
  const passing = player.passing;
  const shooting = player.shooting;
  const dribbling = clamp(player.pace * 0.35 + player.shooting * 0.25 + player.passing * 0.4 + noise(`${seed}-dri`, 4));

  // Physical
  const pace = player.pace;
  const strength = clamp(player.physical + noise(`${seed}-str`, 3));
  const stamina = player.stamina;

  // Mental
  const composure = clamp(player.overall * 0.7 + player.passing * 0.3 + noise(`${seed}-cmp`, 5));
  const leadership = clamp(player.overall * 0.5 + (player.age - 21) * 1.2 + player.defending * 0.1 + noise(`${seed}-ldr`, 6));
  const vision = clamp(player.passing * 0.6 + player.overall * 0.4 + noise(`${seed}-vis`, 5));

  return {
    technical: { passing, shooting, dribbling },
    physical: { pace, strength, stamina },
    mental: { composure, leadership, vision },
    // Compact FIFA-style hexagon axes.
    radar: { PAC: pace, SHO: shooting, PAS: passing, DRI: dribbling, DEF: player.defending, PHY: strength },
  };
}

function deriveCareer(player, position, seed, completedTournaments) {
  const ageFactor = Math.max(0, player.age - 18);
  const internationalCaps = clamp(ageFactor * 4 + (player.overall - 70) * 1.5 + noise(`${seed}-caps`, 8), 0, 168);
  const isGK = position === "GK";
  const goalRate = isGK ? 0 : ATT_POS.has(position) ? 0.45 : MID_POS.has(position) ? 0.2 : 0.05;
  const internationalGoals = isGK
    ? 0
    : clamp(internationalCaps * goalRate * (player.shooting / 85) + noise(`${seed}-intg`, 3), 0, internationalCaps);
  const tournamentAppearances = clamp(Math.floor(ageFactor / 4) + Math.max(0, noise(`${seed}-tapp`, 1)) + (completedTournaments || 0), 0, 12);

  return { internationalCaps, internationalGoals, tournamentAppearances };
}

function emptyTournamentStats() {
  return { matches: 0, goals: 0, assists: 0, averageRating: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 };
}

function findPlayerStat(playerStats, playerId) {
  return (playerStats?.players || []).find((entry) => entry.playerId === playerId) || null;
}

function buildRatingHistory(results, playerId) {
  const history = [];

  (results || []).forEach((match) => {
    const rating = (match.playerRatings || []).find((entry) => entry.playerId === playerId);
    if (!rating) return;

    const label = match.stageName
      ? match.stageName.replace("Round of ", "R").replace("Quarter Final", "QF").replace("Semi Final", "SF").replace("Final", "F")
      : `MD${match.globalMatchday || match.matchday || history.length + 1}`;

    history.push({
      label,
      rating: rating.rating,
      goals: rating.goals || 0,
      assists: rating.assists || 0,
    });
  });

  return history;
}

// Maps a numeric attribute to a broad tier label used for UI coloring.
export function attributeTier(value) {
  if (value >= 85) return "elite";
  if (value >= 78) return "strong";
  if (value >= 68) return "solid";
  return "weak";
}

export function buildPlayerProfile({ team, index, results = [], playerStats = null, completedTournaments = 0 }) {
  const player = team.players[index];
  if (!player) return null;

  const seed = `${team.code}-${index}-${player.name}`;
  const playerId = simPlayerId(team.code, index, player);
  const stat = findPlayerStat(playerStats, playerId);

  const tournament = stat
    ? {
        matches: stat.appearances || 0,
        goals: stat.goals || 0,
        assists: stat.assists || 0,
        averageRating: stat.averageRating || 0,
        cleanSheets: stat.cleanSheets || 0,
        yellowCards: stat.yellowCards || 0,
        redCards: stat.redCards || 0,
      }
    : emptyTournamentStats();

  return {
    id: `${team.code}-${index}`,
    playerId,
    index,
    name: player.name,
    shirtNumber: index + 1,
    nationality: player.nationality,
    team: { code: team.code, name: team.name, flag: team.flag },
    position: player.position,
    age: player.age,
    club: player.club,
    overall: player.overall,
    form: player.form,
    morale: player.morale,
    fitness: player.stamina,
    preferredFoot: FOOTS[hashValue(`${seed}-foot`) % FOOTS.length],
    attributes: deriveAttributes(player, seed),
    tournamentStats: tournament,
    careerStats: deriveCareer(player, player.position, seed, completedTournaments),
    ratingHistory: buildRatingHistory(results, playerId),
  };
}
