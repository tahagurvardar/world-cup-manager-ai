// Helpers for building player-profile route ids and parsing the simulation player id.
// The profile route uses `TEAMCODE-INDEX` (e.g. "TUR-5"); the simulation/award/ratings
// records use `TEAMCODE:INDEX:NAME` (e.g. "TUR:5:Taylan Celik").

export function playerRouteId(teamCode, index) {
  if (!teamCode || index == null) return null;
  return `${teamCode}-${index}`;
}

export function playerRoute(teamCode, index) {
  const id = playerRouteId(teamCode, index);
  return id ? `/player/${id}` : null;
}

// Parses `TEAMCODE:INDEX:NAME` and returns the `TEAMCODE-INDEX` route id.
export function routeIdFromSimId(simId) {
  if (!simId || typeof simId !== "string") return null;
  const parts = simId.split(":");
  if (parts.length < 2) return null;
  const index = Number(parts[1]);
  if (!Number.isInteger(index)) return null;
  return `${parts[0]}-${index}`;
}
