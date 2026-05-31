import { hasDatabaseConnection } from "../config/db.js";
import { teams, findTeamByCode } from "../data/teams.js";
import { Team } from "../models/Team.js";

const currentTeamByCode = new Map(teams.map((team) => [team.code, team]));

function hasCurrentTeamShape(teamList) {
  return teamList.length === teams.length && teamList.every((team) => {
    const current = currentTeamByCode.get(team.code);
    return current && team.name === current.name && team.group === current.group && Boolean(team.flag);
  });
}

async function loadTeams() {
  if (!hasDatabaseConnection()) {
    return teams;
  }

  const storedTeams = await Team.find().lean();
  if (!hasCurrentTeamShape(storedTeams)) return teams;

  const orderByCode = new Map(teams.map((team, index) => [team.code, index]));
  return storedTeams.sort((a, b) => orderByCode.get(a.code) - orderByCode.get(b.code));
}

export async function getTeams(req, res) {
  const teamList = await loadTeams();
  return res.json({
    teams: teamList.map((team) => ({
      code: team.code,
      name: team.name,
      group: team.group,
      region: team.region,
      confederation: team.confederation || team.region,
      flag: team.flag,
      overall: team.overall,
      morale: team.morale,
      form: team.form,
      style: team.style,
      strengths: team.strengths,
      weaknesses: team.weaknesses,
      squadSize: team.players.length,
    })),
  });
}

export async function getTeamByCode(req, res) {
  const code = req.params.code.toUpperCase();
  let team = findTeamByCode(code);

  if (hasDatabaseConnection()) {
    const storedTeams = await Team.find().lean();
    if (hasCurrentTeamShape(storedTeams)) {
      team = storedTeams.find((item) => item.code === code) || team;
    }
  }

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  return res.json({ team });
}
