function topDangerPlayers(team) {
  return [...team.players]
    .filter((player) => ["ST", "LW", "RW", "AM", "CM"].includes(player.position))
    .sort((a, b) => b.overall + b.form - (a.overall + a.form))
    .slice(0, 3)
    .map((player) => `${player.name} (${player.position})`);
}

function describeApproach(team, opponent, tactics) {
  if (tactics.mentality === "attacking" && opponent.overall > team.overall + 4) {
    return "Attack selectively rather than constantly. The opponent has enough quality to punish a stretched midfield.";
  }

  if (tactics.pressing === "high" && opponent.weaknesses.some((weakness) => weakness.includes("build"))) {
    return "Press early, especially on their first pass into midfield, then attack the wide channels quickly.";
  }

  if (tactics.defensiveLine === "high" && opponent.strengths.some((strength) => strength.includes("pace"))) {
    return "Drop the defensive line one step or protect it with a holding midfielder to reduce balls in behind.";
  }

  if (team.overall < opponent.overall) {
    return "Stay compact, keep the first half controlled, and use fast tempo after turnovers.";
  }

  return "Control the middle third, keep the tempo varied, and use your stronger phases to create sustained pressure.";
}

export function generateTacticalAdvice(team, opponent, tactics) {
  return {
    opponentStrengths: opponent.strengths,
    opponentWeaknesses: opponent.weaknesses,
    recommendedApproach: describeApproach(team, opponent, tactics),
    dangerPlayers: topDangerPlayers(opponent),
    keyTacticalAdvice: [
      `${tactics.formation} can work if the nearest midfielder supports transitions immediately.`,
      `Use ${tactics.pressing} pressing with discipline; do not let their best carrier turn into open space.`,
      `A ${tactics.defensiveLine} defensive line needs clear cover whenever the ball is lost in wide areas.`,
    ],
  };
}

export function generateMatchReport(match) {
  const { home, away } = match.teams;
  const homeGoals = match.score.home;
  const awayGoals = match.score.away;
  const knockoutWinner = match.knockout?.winnerTeam?.name;
  const knockoutLoser = match.knockout?.loserTeam?.name;
  const winner = knockoutWinner || (homeGoals === awayGoals ? null : homeGoals > awayGoals ? home.name : away.name);
  const loser = knockoutLoser || (homeGoals === awayGoals ? null : homeGoals > awayGoals ? away.name : home.name);
  const bestEvent =
    match.events.find((event) => event.type === "penalties") ||
    match.events.find((event) => event.type === "extra-time-goal") ||
    match.events.find((event) => event.type === "goal" && event.player === match.manOfTheMatch.name) ||
    match.events.find((event) => event.type === "goal");
  const resolution =
    match.knockout?.resolution === "penalties"
      ? ` on penalties after a ${match.knockout.normalTimeScore.home}-${match.knockout.normalTimeScore.away} draw`
      : match.knockout?.resolution === "extra-time"
        ? " after extra time"
        : "";

  return {
    shortSummary: winner
      ? `${winner} beat ${loser} ${homeGoals}-${awayGoals}${resolution} in a match shaped by chance quality and momentum swings.`
      : `${home.name} and ${away.name} shared a ${homeGoals}-${awayGoals} draw after a tight tactical battle.`,
    tacticalAnalysis:
      match.stats.possession.home > match.stats.possession.away
        ? `${home.name} controlled more of the ball, but the xG profile shows how important shot selection became.`
        : `${away.name} held more possession, forcing ${home.name} to defend longer phases and counter quickly.`,
    keyTurningPoint: bestEvent
      ? `${bestEvent.minute}' - ${bestEvent.description}`
      : "The key turning point was the final 20 minutes, where fatigue changed the rhythm of pressing and recovery runs.",
    bestPlayer: `${match.manOfTheMatch.name} (${match.manOfTheMatch.team})`,
    improveBeforeNextMatch:
      match.stats.fouls.home + match.stats.fouls.away > 25
        ? "Reduce unnecessary fouls and protect key players from suspension risk."
        : "Improve final-third shot quality and keep stamina higher for the closing phase.",
  };
}

export function generateNewsHeadline(match) {
  const home = match.teams.home.name;
  const away = match.teams.away.name;
  const homeGoals = match.score.home;
  const awayGoals = match.score.away;
  const goalGap = Math.abs(homeGoals - awayGoals);

  if (match.knockout?.winnerTeam && match.knockout?.loserTeam) {
    const winner = match.knockout.winnerTeam.name;
    const loser = match.knockout.loserTeam.name;
    const resolution =
      match.knockout.resolution === "penalties"
        ? "on penalties"
        : match.knockout.resolution === "extra-time"
          ? "after extra time"
          : "in knockout test";

    if (match.stage === "final") {
      return `${winner} lift the World Cup after beating ${loser} ${resolution}`;
    }

    if (match.stage === "thirdPlace") {
      return `${winner} claim third place against ${loser}`;
    }

    return `${winner} knock out ${loser} ${resolution}`;
  }

  if (homeGoals === awayGoals) {
    return `${home} and ${away} locked in tense World Cup draw`;
  }

  const winner = homeGoals > awayGoals ? home : away;
  const loser = homeGoals > awayGoals ? away : home;

  if (goalGap >= 3) {
    return `${winner} cruise past ${loser} with statement World Cup win`;
  }

  if (goalGap === 1 && Math.max(homeGoals, awayGoals) >= 3) {
    return `${winner} edge ${loser} in dramatic World Cup clash`;
  }

  return `${winner} survive pressure to beat ${loser}`;
}
