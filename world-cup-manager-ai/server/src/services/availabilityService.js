// Injury and suspension availability helpers for the manager's selected team.
// Records are persisted on GameState as plain objects (Mixed) so they survive saves and
// default safely to empty for existing games.

export const INJURY_TYPES = ["hamstring strain", "ankle sprain", "knee knock", "muscle fatigue", "shoulder injury"];

export function matchesOutForSeverity(severity) {
  if (severity === "serious") return 3;
  if (severity === "moderate") return 2;
  return 1;
}

function activeInjury(record) {
  return record && record.matchesOut > 0 && record.status === "injured";
}

function activeSuspension(record) {
  return record && record.matchesOut > 0 && record.active;
}

// Builds a map of unavailable players for a team: index -> availability detail.
export function buildAvailabilityMap(teamCode, injuries = [], suspensions = []) {
  const map = new Map();

  injuries.forEach((record) => {
    if (record.teamCode === teamCode && activeInjury(record)) {
      map.set(record.index, {
        status: "injured",
        injuryType: record.injuryType,
        severity: record.severity,
        matchesOut: record.matchesOut,
        label: record.injuryType,
        reason: record.injuryType,
      });
    }
  });

  suspensions.forEach((record) => {
    if (record.teamCode === teamCode && activeSuspension(record) && !map.has(record.index)) {
      map.set(record.index, {
        status: "suspended",
        reason: record.reason,
        matchesOut: record.matchesOut,
        label: record.reason,
      });
    }
  });

  return map;
}

export function unavailableIndexSet(teamCode, injuries, suspensions) {
  return new Set(buildAvailabilityMap(teamCode, injuries, suspensions).keys());
}

// Returns the availability descriptor for a single player index ("available" by default).
export function availabilityFor(map, index) {
  return map.get(index) || { status: "available", label: "Available", matchesOut: 0 };
}

// Decrements matches-out on all currently active records for a team (called after the
// manager plays a match, since the player has now served one matchday/round out).
export function decrementActiveRecords(injuries = [], suspensions = [], teamCode) {
  injuries.forEach((record) => {
    if (record.teamCode === teamCode && activeInjury(record)) {
      record.matchesOut -= 1;
      if (record.matchesOut <= 0) {
        record.matchesOut = 0;
        record.status = "recovered";
      }
    }
  });

  suspensions.forEach((record) => {
    if (record.teamCode === teamCode && activeSuspension(record)) {
      record.matchesOut -= 1;
      if (record.matchesOut <= 0) {
        record.matchesOut = 0;
        record.active = false;
      }
    }
  });
}

// Converts the manager team's injury events from a played match into persisted records.
// `baseMatch` is the sequential manager-match number just played, used for a display-only
// "returns after match" estimate.
export function injuryRecordsFromMatch(match, teamCode, baseMatch = 0) {
  return (match.injuries || [])
    .filter((injury) => injury.teamCode === teamCode)
    .map((injury) => ({
      playerId: injury.playerId,
      playerName: injury.name,
      teamCode,
      index: injury.index,
      injuryType: injury.injuryType,
      severity: injury.severity,
      matchesOut: injury.matchesOut,
      returnAfterMatchday: baseMatch + injury.matchesOut,
      status: "injured",
    }));
}

// Processes cards from a played match into new suspensions and accumulated-yellow updates.
// Red cards suspend for the next match; a second tournament yellow triggers a one-match ban.
export function processMatchCards(match, teamCode, accumulatedYellows) {
  const yellows = accumulatedYellows || {};
  const newSuspensions = [];
  const suspendedThisMatch = new Set();

  const events = match.events || [];

  // Red cards first.
  events
    .filter((event) => event.type === "red-card" && event.teamCode === teamCode && event.cardedPlayer)
    .forEach((event) => {
      const index = event.cardedPlayer.index;
      if (index == null || suspendedThisMatch.has(index)) return;
      suspendedThisMatch.add(index);
      newSuspensions.push({
        playerId: event.cardedPlayer.id,
        playerName: event.cardedPlayer.name,
        teamCode,
        index,
        reason: "Red card",
        matchesOut: 1,
        active: true,
      });
    });

  // Yellow card accumulation.
  events
    .filter((event) => event.type === "yellow-card" && event.teamCode === teamCode && event.cardedPlayer)
    .forEach((event) => {
      const index = event.cardedPlayer.index;
      if (index == null) return;
      yellows[index] = (yellows[index] || 0) + 1;

      if (yellows[index] >= 2 && !suspendedThisMatch.has(index)) {
        suspendedThisMatch.add(index);
        yellows[index] -= 2;
        newSuspensions.push({
          playerId: event.cardedPlayer.id,
          playerName: event.cardedPlayer.name,
          teamCode,
          index,
          reason: "Two yellow cards",
          matchesOut: 1,
          active: true,
        });
      }
    });

  return { newSuspensions, accumulatedYellows: yellows };
}

// Summarizes squad availability for the dashboard card.
export function availabilitySummary(team, injuries, suspensions) {
  const map = buildAvailabilityMap(team.code, injuries, suspensions);
  const injured = [];
  const suspended = [];

  map.forEach((detail, index) => {
    const player = team.players[index];
    if (!player) return;
    const entry = { index, name: player.name, position: player.position, matchesOut: detail.matchesOut, label: detail.label };
    if (detail.status === "injured") injured.push(entry);
    else suspended.push(entry);
  });

  const total = team.players.length;
  return {
    total,
    available: total - map.size,
    injured,
    suspended,
    injuredCount: injured.length,
    suspendedCount: suspended.length,
  };
}
