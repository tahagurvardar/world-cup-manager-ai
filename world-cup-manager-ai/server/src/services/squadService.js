import { DEFAULT_FORMATION, FORMATIONS, getFormationSlots } from "../data/formations.js";

// Maps each position to a broad unit used for bench balancing and fallback matching.
const POSITION_GROUP = {
  GK: "GK",
  RB: "DEF",
  LB: "DEF",
  CB: "DEF",
  DM: "MID",
  CM: "MID",
  AM: "MID",
  LW: "ATT",
  RW: "ATT",
  ST: "ATT",
};

// Ordered fallback positions when no natural fit is available for a slot.
const RELATED_POSITIONS = {
  GK: ["GK"],
  RB: ["RB", "LB", "CB"],
  LB: ["LB", "RB", "CB"],
  CB: ["CB", "RB", "LB"],
  DM: ["DM", "CM"],
  CM: ["CM", "DM", "AM"],
  AM: ["AM", "CM", "RW", "LW"],
  RW: ["RW", "LW", "AM", "ST"],
  LW: ["LW", "RW", "AM", "ST"],
  ST: ["ST", "RW", "LW", "AM"],
};

const DEFAULT_BENCH_SIZE = 9;
const MIN_BENCH_SIZE = 7;
const MAX_BENCH_SIZE = 12;

function playerScore(player) {
  if (!player) return -Infinity;
  return player.overall + player.form * 0.15;
}

function pickBestIndex(players, positions, used) {
  let bestIndex = -1;
  let bestScore = -Infinity;

  players.forEach((player, index) => {
    if (used.has(index) || !positions.includes(player.position)) return;
    const score = playerScore(player);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function pickBestAnyIndex(players, used) {
  let bestIndex = -1;
  let bestScore = -Infinity;

  players.forEach((player, index) => {
    if (used.has(index)) return;
    const score = playerScore(player);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function pickForSlot(players, slotPosition, used) {
  const ladder = RELATED_POSITIONS[slotPosition] || [slotPosition];
  for (const positions of [[slotPosition], ...ladder.map((position) => [position])]) {
    const index = pickBestIndex(players, positions, used);
    if (index >= 0) return index;
  }
  return pickBestAnyIndex(players, used);
}

export function normalizeFormation(formation) {
  return FORMATIONS.includes(formation) ? formation : DEFAULT_FORMATION;
}

// Builds a default Starting XI for a formation by filling each slot with the best
// available player for that position (with positional fallback), no player reused.
export function generateStartingXI(team, formation) {
  const players = team.players || [];
  const slots = getFormationSlots(formation);
  const used = new Set();

  return slots.map((slot) => {
    const playerIndex = pickForSlot(players, slot.position, used);
    if (playerIndex >= 0) used.add(playerIndex);
    return { slot: slot.id, position: slot.position, playerIndex };
  });
}

// Builds a balanced bench from players not in the Starting XI, preferring a backup
// goalkeeper, then defenders, midfielders, and attackers, finally the best remaining.
export function generateBench(team, usedIndices, size = DEFAULT_BENCH_SIZE) {
  const players = team.players || [];
  const used = new Set(usedIndices);
  const benchSize = Math.max(MIN_BENCH_SIZE, Math.min(MAX_BENCH_SIZE, size));
  const bench = [];

  const take = (index) => {
    if (index >= 0 && !used.has(index)) {
      used.add(index);
      bench.push(index);
    }
  };

  // Backup goalkeeper first.
  take(pickBestIndex(players, ["GK"], used));

  // Guarantee outfield coverage across units.
  const quotas = [["DEF", 2], ["MID", 2], ["ATT", 2]];
  quotas.forEach(([group, count]) => {
    for (let filled = 0; filled < count && bench.length < benchSize; filled += 1) {
      const positions = Object.keys(POSITION_GROUP).filter((position) => POSITION_GROUP[position] === group);
      take(pickBestIndex(players, positions, used));
    }
  });

  // Fill any remaining bench seats with the best available outfield players.
  while (bench.length < benchSize) {
    const index = pickBestAnyIndex(players, used);
    if (index < 0) break;
    take(index);
  }

  return bench;
}

// Chooses a captain and vice-captain from the Starting XI: the two highest-rated
// players, breaking ties by form so the armband feels deserved.
export function defaultCaptains(team, startingXI) {
  const players = team.players || [];
  const ranked = startingXI
    .map((entry) => entry.playerIndex)
    .filter((index) => isValidIndex(team, index))
    .sort((a, b) => playerScore(players[b]) - playerScore(players[a]));

  return {
    captainIndex: ranked[0] ?? null,
    viceCaptainIndex: ranked[1] ?? null,
  };
}

// Ensures captain and vice-captain are both inside the XI and distinct, defaulting to
// the standout players when a submitted value is missing or no longer eligible.
function normalizeCaptains(team, startingXI, captainIndex, viceCaptainIndex) {
  const xiIndices = new Set(startingXI.map((entry) => entry.playerIndex));
  const fallback = defaultCaptains(team, startingXI);

  let captain = xiIndices.has(Number(captainIndex)) ? Number(captainIndex) : fallback.captainIndex;
  let vice = xiIndices.has(Number(viceCaptainIndex)) ? Number(viceCaptainIndex) : fallback.viceCaptainIndex;

  if (vice === captain) {
    vice = startingXI.map((entry) => entry.playerIndex).find((index) => index !== captain) ?? null;
  }

  return { captainIndex: captain ?? null, viceCaptainIndex: vice ?? null };
}

// Produces a complete default squad selection (XI + bench + armbands) for a formation.
export function generateSquadSelection(team, formation) {
  const normalized = normalizeFormation(formation);
  const startingXI = generateStartingXI(team, normalized);
  const usedIndices = startingXI.map((entry) => entry.playerIndex).filter((index) => index >= 0);
  const bench = generateBench(team, usedIndices);
  const { captainIndex, viceCaptainIndex } = defaultCaptains(team, startingXI);

  return { formation: normalized, startingXI, bench, captainIndex, viceCaptainIndex };
}

function isValidIndex(team, index) {
  return Number.isInteger(index) && index >= 0 && index < (team.players?.length || 0);
}

// Validates a stored squad against the team and current formation. A squad is only
// reusable if it matches the formation, fills every slot with a real, unique player.
export function isSquadValid(team, squad, formation) {
  if (!squad || squad.formation !== normalizeFormation(formation)) return false;
  const slots = getFormationSlots(formation);
  if (!Array.isArray(squad.startingXI) || squad.startingXI.length !== slots.length) return false;

  const seen = new Set();
  for (const entry of squad.startingXI) {
    if (!isValidIndex(team, entry?.playerIndex)) return false;
    if (seen.has(entry.playerIndex)) return false;
    seen.add(entry.playerIndex);
  }

  return true;
}

// Returns the squad to use for the current formation, regenerating a default if the
// stored squad is missing or no longer matches the formation.
export function resolveSquadSelection(team, squad, formation) {
  if (isSquadValid(team, squad, formation)) {
    const bench = Array.isArray(squad.bench)
      ? squad.bench.filter((index) => isValidIndex(team, index))
      : [];
    const { captainIndex, viceCaptainIndex } = normalizeCaptains(team, squad.startingXI, squad.captainIndex, squad.viceCaptainIndex);
    return { formation: normalizeFormation(formation), startingXI: squad.startingXI, bench, captainIndex, viceCaptainIndex };
  }
  return generateSquadSelection(team, formation);
}

// Validates and normalizes a manager-submitted squad selection against the team and the
// formation slots. Throws on any structural problem (wrong size, invalid or duplicate
// players). Bench entries that are invalid or already in the XI are dropped silently.
export function buildSquadFromInput(team, formation, startingXI, bench, captainIndex, viceCaptainIndex) {
  const normalized = normalizeFormation(formation);
  const slots = getFormationSlots(normalized);

  if (!Array.isArray(startingXI) || startingXI.length !== slots.length) {
    throw new Error(`Starting XI must contain exactly ${slots.length} players for a ${normalized}.`);
  }

  const used = new Set();
  const cleanXI = slots.map((slot, index) => {
    const entry = startingXI[index] || {};
    const playerIndex = Number(entry.playerIndex);

    if (!isValidIndex(team, playerIndex)) {
      throw new Error(`Invalid player for slot ${slot.id}.`);
    }
    if (used.has(playerIndex)) {
      throw new Error(`Player cannot be selected in more than one position.`);
    }
    used.add(playerIndex);

    return { slot: slot.id, position: slot.position, playerIndex };
  });

  const cleanBench = Array.isArray(bench)
    ? [...new Set(bench.map(Number))].filter((index) => isValidIndex(team, index) && !used.has(index))
    : [];

  const captains = normalizeCaptains(team, cleanXI, captainIndex, viceCaptainIndex);

  return { formation: normalized, startingXI: cleanXI, bench: cleanBench, ...captains };
}

// Resolves a Starting XI (array of slot entries) into the concrete player objects from
// the team squad, used by the simulation engine. Falls back to null when unavailable.
export function lineupPlayers(team, startingXI) {
  if (!Array.isArray(startingXI) || !startingXI.length) return null;
  const players = startingXI
    .map((entry) => (isValidIndex(team, entry?.playerIndex) ? team.players[entry.playerIndex] : null))
    .filter(Boolean);
  return players.length === 11 ? players : null;
}

// Mean overall of the eleven selected players — the dynamic "team overall" that reflects
// the manager's lineup choices rather than the static nation rating.
export function lineupOverall(team, startingXI) {
  const players = team.players || [];
  const ratings = (startingXI || [])
    .map((entry) => (isValidIndex(team, entry.playerIndex) ? players[entry.playerIndex].overall : null))
    .filter((value) => value != null);
  if (!ratings.length) return team.overall || 0;
  return Math.round(ratings.reduce((total, value) => total + value, 0) / ratings.length);
}

// Picks the best available replacement index for a slot position from a candidate pool,
// honouring the related-position ladder and excluding already-used / unavailable players.
function bestFromPool(players, pool, positions, exclude) {
  let bestIndex = -1;
  let bestScore = -Infinity;
  pool.forEach((index) => {
    if (exclude.has(index)) return;
    const player = players[index];
    if (!player) return;
    if (positions && !positions.includes(player.position)) return;
    const score = playerScore(player);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function pickReplacement(players, slotPosition, bench, exclude) {
  const ladder = RELATED_POSITIONS[slotPosition] || [slotPosition];
  const allIndices = players.map((_, index) => index);

  // Prefer the bench, walking the position ladder, then any bench player.
  for (const positions of [[slotPosition], ...ladder.map((position) => [position])]) {
    const fromBench = bestFromPool(players, bench, positions, exclude);
    if (fromBench >= 0) return fromBench;
  }
  const benchAny = bestFromPool(players, bench, null, exclude);
  if (benchAny >= 0) return benchAny;

  // Fall back to the wider squad with the same ladder preference.
  for (const positions of [[slotPosition], ...ladder.map((position) => [position])]) {
    const fromSquad = bestFromPool(players, allIndices, positions, exclude);
    if (fromSquad >= 0) return fromSquad;
  }
  return bestFromPool(players, allIndices, null, exclude);
}

// Replaces unavailable (injured/suspended) starters with the best eligible bench/squad
// player so the simulation never fields an unavailable player. Returns the adjusted XI
// plus the list of forced changes for news + UI.
export function buildAvailableLineup(team, startingXI, bench = [], unavailableSet = new Set()) {
  const players = team.players || [];
  const changes = [];
  const used = new Set(startingXI.map((entry) => entry.playerIndex));

  const nextXI = startingXI.map((entry) => {
    if (!unavailableSet.has(entry.playerIndex)) return { ...entry };

    used.delete(entry.playerIndex);
    const exclude = new Set([...used, ...unavailableSet]);
    const replacement = pickReplacement(players, entry.position, bench, exclude);

    if (replacement < 0) {
      used.add(entry.playerIndex);
      return { ...entry };
    }

    used.add(replacement);
    changes.push({
      slot: entry.slot,
      position: entry.position,
      out: entry.playerIndex,
      outName: players[entry.playerIndex]?.name,
      in: replacement,
      inName: players[replacement]?.name,
    });
    return { ...entry, playerIndex: replacement };
  });

  return { startingXI: nextXI, changes };
}

// Attaches full player attributes to a squad selection for client consumption. An optional
// availability map (index -> detail) annotates each player with injury/suspension status.
export function decorateSquadSelection(team, squad, availabilityMap = null) {
  const players = team.players || [];
  const decoratePlayer = (index) => {
    if (!isValidIndex(team, index)) return null;
    const availability = availabilityMap?.get(index) || { status: "available", label: "Available", matchesOut: 0 };
    return { ...players[index], index, availability };
  };

  return {
    formation: squad.formation,
    captainIndex: squad.captainIndex ?? null,
    viceCaptainIndex: squad.viceCaptainIndex ?? null,
    lineupOverall: lineupOverall(team, squad.startingXI),
    startingXI: squad.startingXI.map((entry) => ({
      slot: entry.slot,
      position: entry.position,
      playerIndex: entry.playerIndex,
      isCaptain: entry.playerIndex === squad.captainIndex,
      isViceCaptain: entry.playerIndex === squad.viceCaptainIndex,
      player: decoratePlayer(entry.playerIndex),
    })),
    bench: squad.bench.map((index) => decoratePlayer(index)).filter(Boolean),
  };
}
