function emptyPlayerStat(rating) {
  return {
    playerId: rating.playerId,
    name: rating.name,
    teamCode: rating.teamCode,
    teamName: rating.teamName,
    position: rating.position,
    age: rating.age,
    goals: 0,
    assists: 0,
    appearances: 0,
    cleanSheets: 0,
    yellowCards: 0,
    redCards: 0,
    ownGoals: 0,
    ratingTotal: 0,
    ratingsCount: 0,
    averageRating: 0,
  };
}

function sortPlayers(players) {
  return [...players].sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
    return a.name.localeCompare(b.name);
  });
}

function getWinnerName(match) {
  if (!match) return null;
  if (match.winnerTeam) return match.winnerTeam;
  if (match.knockout?.winnerTeam?.name) return match.knockout.winnerTeam.name;
  if (match.winnerTeamCode === match.homeTeamCode) return match.homeTeam || match.homeSeed;
  if (match.winnerTeamCode === match.awayTeamCode) return match.awayTeam || match.awaySeed;
  return null;
}

function getLoserName(match) {
  if (!match) return null;
  if (match.loserTeam) return match.loserTeam;
  if (match.knockout?.loserTeam?.name) return match.knockout.loserTeam.name;
  if (match.loserTeamCode === match.homeTeamCode) return match.homeTeam || match.homeSeed;
  if (match.loserTeamCode === match.awayTeamCode) return match.awayTeam || match.awaySeed;
  return null;
}

function toAward(player, value, detail) {
  if (!player) return null;

  return {
    playerId: player.playerId,
    name: player.name,
    teamCode: player.teamCode,
    teamName: player.teamName,
    position: player.position,
    age: player.age,
    value,
    detail,
    goals: player.goals,
    assists: player.assists,
    appearances: player.appearances,
    cleanSheets: player.cleanSheets,
    averageRating: player.averageRating,
  };
}

function pickLeader(players, compare) {
  return [...players].sort(compare)[0] || null;
}

function compareScorers(a, b) {
  if (b.goals !== a.goals) return b.goals - a.goals;
  if (b.assists !== a.assists) return b.assists - a.assists;
  if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
  return a.name.localeCompare(b.name);
}

function compareAssistProviders(a, b) {
  if (b.assists !== a.assists) return b.assists - a.assists;
  if (b.goals !== a.goals) return b.goals - a.goals;
  if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
  return a.name.localeCompare(b.name);
}

function compareGoalkeepers(a, b) {
  if (b.cleanSheets !== a.cleanSheets) return b.cleanSheets - a.cleanSheets;
  if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
  if (b.appearances !== a.appearances) return b.appearances - a.appearances;
  return a.name.localeCompare(b.name);
}

function compareRatings(a, b) {
  if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
  if (b.goals + b.assists !== a.goals + a.assists) return b.goals + b.assists - (a.goals + a.assists);
  if (b.appearances !== a.appearances) return b.appearances - a.appearances;
  return a.name.localeCompare(b.name);
}

export function buildTournamentPlayerStats(results = []) {
  const statsByPlayer = {};

  results.forEach((match) => {
    (match.playerRatings || []).forEach((rating) => {
      if (!statsByPlayer[rating.playerId]) statsByPlayer[rating.playerId] = emptyPlayerStat(rating);
      const stat = statsByPlayer[rating.playerId];

      stat.goals += rating.goals || 0;
      stat.assists += rating.assists || 0;
      stat.appearances += 1;
      stat.cleanSheets += rating.cleanSheet ? 1 : 0;
      stat.yellowCards += rating.yellowCards || 0;
      stat.redCards += rating.redCards || 0;
      stat.ownGoals += rating.ownGoals || 0;
      stat.ratingTotal += rating.rating || 0;
      stat.ratingsCount += rating.rating ? 1 : 0;
      stat.averageRating = stat.ratingsCount ? Number((stat.ratingTotal / stat.ratingsCount).toFixed(2)) : 0;
    });
  });

  const players = sortPlayers(Object.values(statsByPlayer));

  return {
    players,
    leaders: {
      goals: players.filter((player) => player.goals > 0).sort(compareScorers).slice(0, 10),
      assists: players.filter((player) => player.assists > 0).sort(compareAssistProviders).slice(0, 10),
      ratings: players.filter((player) => player.ratingsCount > 0).sort(compareRatings).slice(0, 10),
      cleanSheets: players.filter((player) => player.position === "GK" && player.cleanSheets > 0).sort(compareGoalkeepers).slice(0, 10),
    },
  };
}

export function buildTournamentAwards(tournament, playerStats) {
  const players = playerStats?.players || [];
  const ratedPlayers = players.filter((player) => player.ratingsCount > 0);
  const regularRatedPlayers = ratedPlayers.filter((player) => player.appearances >= 3);
  const youngPlayers = ratedPlayers.filter((player) => player.age <= 21 && player.appearances >= 2);
  const goalkeepers = players.filter((player) => player.position === "GK" && player.appearances >= 2);
  const finalMatch = tournament?.knockout?.final?.[0];
  const thirdPlaceMatch = tournament?.knockout?.thirdPlace?.[0];
  const goldenBoot = pickLeader(players.filter((player) => player.goals > 0), compareScorers);
  const mostAssists = pickLeader(players.filter((player) => player.assists > 0), compareAssistProviders);
  const goldenGlove = pickLeader(goalkeepers, compareGoalkeepers);
  const bestPlayer = pickLeader(regularRatedPlayers.length ? regularRatedPlayers : ratedPlayers, compareRatings);
  const bestYoungPlayer = pickLeader(youngPlayers, compareRatings);

  return {
    completed: Boolean(tournament?.tournamentComplete),
    podium: {
      champion: getWinnerName(finalMatch),
      runnerUp: getLoserName(finalMatch),
      thirdPlace: getWinnerName(thirdPlaceMatch),
      fourthPlace: getLoserName(thirdPlaceMatch),
    },
    individual: {
      goldenBoot: toAward(goldenBoot, goldenBoot ? `${goldenBoot.goals} goals` : null, "Top scorer"),
      mostAssists: toAward(mostAssists, mostAssists ? `${mostAssists.assists} assists` : null, "Top assist provider"),
      goldenGlove: toAward(
        goldenGlove,
        goldenGlove ? `${goldenGlove.cleanSheets} clean sheets` : null,
        goldenGlove ? `${goldenGlove.averageRating.toFixed(2)} average rating` : "Best goalkeeper",
      ),
      bestPlayer: toAward(bestPlayer, bestPlayer ? `${bestPlayer.averageRating.toFixed(2)} average` : null, "Highest tournament rating"),
      bestYoungPlayer: toAward(bestYoungPlayer, bestYoungPlayer ? `${bestYoungPlayer.averageRating.toFixed(2)} average` : null, "Age 21 or younger"),
    },
  };
}
