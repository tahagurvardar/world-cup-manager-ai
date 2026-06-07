import api from "./api";

export async function fetchTeams() {
  const { data } = await api.get("/teams");
  return data.teams;
}

export async function selectTeam(teamCode) {
  const { data } = await api.post("/game/select-team", { teamCode });
  return data.dashboard;
}

export async function startNewTournament() {
  const { data } = await api.post("/game/new-tournament");
  return data.dashboard;
}

export async function fetchDashboard() {
  const { data } = await api.get("/game/dashboard");
  return data.dashboard;
}

export async function fetchSquad() {
  const { data } = await api.get("/game/squad");
  return data;
}

export async function saveSquad(selection) {
  const { data } = await api.put("/game/squad", selection);
  return data;
}

export async function autoSquad(formation) {
  const { data } = await api.post("/game/squad/auto", formation ? { formation } : {});
  return data;
}

export async function fetchPlayerProfile(playerId) {
  const { data } = await api.get(`/game/player/${playerId}`);
  return data.profile;
}

export async function fetchTactics() {
  const { data } = await api.get("/game/tactics");
  return data.tactics;
}

export async function saveTactics(tactics) {
  const { data } = await api.put("/game/tactics", tactics);
  return data.tactics;
}

export async function simulateMatch() {
  const { data } = await api.post("/game/simulate");
  return data;
}

export async function fetchTournament() {
  const { data } = await api.get("/game/tournament");
  return data.tournament;
}

export async function fetchNews() {
  const { data } = await api.get("/game/news");
  return data.news;
}
