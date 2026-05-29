import { findTeamByCode } from "../data/teams.js";
import { generateMatchReport, generateTacticalAdvice } from "../services/aiService.js";

export async function tacticalAdvice(req, res) {
  const { teamCode, opponentCode, tactics } = req.body;
  const team = teamCode ? findTeamByCode(teamCode.toUpperCase()) : null;
  const opponent = opponentCode ? findTeamByCode(opponentCode.toUpperCase()) : null;

  if (!team || !opponent) {
    return res.status(400).json({ message: "Valid teamCode and opponentCode are required." });
  }

  return res.json({
    advice: generateTacticalAdvice(team, opponent, tactics || {}),
  });
}

export async function matchReport(req, res) {
  const { match } = req.body;

  if (!match?.teams || !match?.score || !match?.stats) {
    return res.status(400).json({ message: "A simulated match payload is required." });
  }

  return res.json({ report: generateMatchReport(match) });
}
