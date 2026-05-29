import { hasDatabaseConnection } from "../config/db.js";
import { teams, findTeamByCode } from "../data/teams.js";
import { Team } from "../models/Team.js";

async function loadTeams() {
  if (!hasDatabaseConnection()) {
    return teams;
  }

  const storedTeams = await Team.find().sort({ group: 1, name: 1 }).lean();
  return storedTeams.length === teams.length ? storedTeams : teams;
}

export async function getTeams(req, res) {
  const teamList = await loadTeams();
  return res.json({
    teams: teamList.map((team) => ({
      code: team.code,
      name: team.name,
      group: team.group,
      region: team.region,
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
    const storedTeamCount = await Team.countDocuments();
    if (storedTeamCount === teams.length) {
      team = (await Team.findOne({ code }).lean()) || team;
    }
  }

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  return res.json({ team });
}
