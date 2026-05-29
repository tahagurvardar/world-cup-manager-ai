import { useEffect, useState } from "react";
import { GitBranch, Trophy } from "lucide-react";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import { sampleTeams } from "../data/sampleData";
import { fetchTournament } from "../services/gameService";

const roundLabels = {
  roundOf32: "Round of 32",
  roundOf16: "Round of 16",
  quarterFinal: "Quarter Final",
  semiFinal: "Semi Final",
  thirdPlace: "Third Place Match",
  final: "Final",
};

const bracketRounds = ["roundOf32", "roundOf16", "quarterFinal", "semiFinal", "thirdPlace", "final"];

function fallbackTournament() {
  const groups = sampleTeams.reduce((collection, team) => {
    const group = collection[team.group] || [];
    return { ...collection, [team.group]: [...group, team] };
  }, {});

  return {
    currentStage: "Group Stage",
    thirdPlaceRanking: [],
    groupStage: {
      playedFixtures: 0,
      totalFixtures: 72,
      table: Object.entries(groups).map(([group, teams]) => ({
        group,
        rows: teams.map((team) => ({
          teamCode: team.code,
          teamName: team.name,
          overall: team.overall,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        })),
      })),
    },
    knockout: {
      roundOf32: Array.from({ length: 16 }, (_, index) => ({
        id: `R32-${index + 1}`,
        homeSeed: `Qualifier ${index + 1}`,
        awaySeed: `Qualifier ${32 - index}`,
      })),
      roundOf16: Array.from({ length: 8 }, (_, index) => ({
        id: `R16-${index + 1}`,
        homeSeed: `Winner R32-${index * 2 + 1}`,
        awaySeed: `Winner R32-${index * 2 + 2}`,
      })),
      quarterFinal: Array.from({ length: 4 }, (_, index) => ({
        id: `QF-${index + 1}`,
        homeSeed: `Winner R16-${index * 2 + 1}`,
        awaySeed: `Winner R16-${index * 2 + 2}`,
      })),
      semiFinal: [
        { id: "SF-1", homeSeed: "Winner QF-1", awaySeed: "Winner QF-2" },
        { id: "SF-2", homeSeed: "Winner QF-3", awaySeed: "Winner QF-4" },
      ],
      thirdPlace: [{ id: "TP-1", homeSeed: "Loser SF-1", awaySeed: "Loser SF-2" }],
      final: [{ id: "F-1", homeSeed: "Winner SF-1", awaySeed: "Winner SF-2" }],
    },
  };
}

export default function TournamentPage() {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchTournament()
      .then((data) => {
        if (isMounted) setTournament(data);
      })
      .catch(() => {
        if (isMounted) setTournament(fallbackTournament());
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <LoadingState label="Loading tournament..." />;

  return (
    <>
      <PageHeader
        title="Tournament"
        description="2026-style 48-team group stage with top two plus the best eight third-place teams feeding a simplified Round of 32 bracket."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {tournament.groupStage.table.map((group) => (
            <Panel key={group.group} className="p-5">
              <h2 className="mb-4 text-lg font-semibold text-white">Group {group.group}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="py-3 pr-4">Team</th>
                      <th className="py-3 pr-4">P</th>
                      <th className="py-3 pr-4">W</th>
                      <th className="py-3 pr-4">D</th>
                      <th className="py-3 pr-4">L</th>
                      <th className="py-3 pr-4">GF</th>
                      <th className="py-3 pr-4">GA</th>
                      <th className="py-3 pr-4">GD</th>
                      <th className="py-3">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.08]">
                    {group.rows.map((row) => (
                      <tr key={row.teamCode} className="text-slate-300">
                        <td className="py-3 pr-4 font-medium text-white">{row.teamName}</td>
                        <td className="py-3 pr-4">{row.played}</td>
                        <td className="py-3 pr-4">{row.wins}</td>
                        <td className="py-3 pr-4">{row.draws}</td>
                        <td className="py-3 pr-4">{row.losses}</td>
                        <td className="py-3 pr-4">{row.goalsFor}</td>
                        <td className="py-3 pr-4">{row.goalsAgainst}</td>
                        <td className="py-3 pr-4">{row.goalDifference}</td>
                        <td className="py-3 font-semibold text-pitch-100">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}
        </div>

        <div className="space-y-6">
          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-white">Best Third-Place Ranking</h2>
            <div className="mt-4 space-y-2">
              {(tournament.thirdPlaceRanking || []).map((row) => (
                <div
                  key={`${row.group}-${row.teamCode}`}
                  className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {row.rank}. {row.teamName}
                    </p>
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Group {row.group}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-pitch-100">{row.points} pts</p>
                    <p className="text-xs text-slate-500">GD {row.goalDifference}</p>
                  </div>
                </div>
              ))}
              {!tournament.thirdPlaceRanking?.length ? (
                <p className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-400">
                  Third-place ranking appears as group matches are played.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-pitch-400/12 text-pitch-200">
                <GitBranch size={20} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-white">Knockout Path</h2>
                <p className="text-sm text-slate-400">{tournament.currentStage}</p>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[1140px] grid-cols-6 gap-3">
                {bracketRounds.map((round) => (
                  <div key={round}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {roundLabels[round] || round}
                    </h3>
                    <div className="space-y-2">
                      {(tournament.knockout[round] || []).map((match) => (
                        <BracketMatch key={match.id} match={match} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function BracketMatch({ match }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm">
      <BracketTeam
        name={match.homeTeam || match.homeSeed}
        score={match.score?.home}
        isWinner={match.winnerTeamCode && match.winnerTeamCode === match.homeTeamCode}
      />
      <div className="my-2 flex items-center justify-between text-xs uppercase tracking-[0.12em] text-slate-500">
        <span>{match.id}</span>
        <Trophy size={14} className={match.status === "played" ? "text-pitch-200" : "text-slate-600"} />
      </div>
      <BracketTeam
        name={match.awayTeam || match.awaySeed}
        score={match.score?.away}
        isWinner={match.winnerTeamCode && match.winnerTeamCode === match.awayTeamCode}
      />
      <p className="mt-2 text-xs capitalize text-slate-500">{formatBracketStatus(match)}</p>
    </div>
  );
}

function BracketTeam({ name, score, isWinner }) {
  return (
    <div
      className={`flex min-h-9 items-center justify-between gap-2 rounded-md px-2 py-2 ${
        isWinner ? "bg-pitch-400/12 text-pitch-50" : "bg-white/[0.035] text-slate-300"
      }`}
    >
      <span className="truncate font-medium">{name}</span>
      <span className="font-semibold">{score ?? "-"}</span>
    </div>
  );
}

function formatBracketStatus(match) {
  if (match.knockout?.resolution === "penalties" && match.knockout.penalties) {
    return `played · ${match.knockout.penalties.home}-${match.knockout.penalties.away} pens`;
  }

  if (match.knockout?.resolution === "extra-time") {
    return "played · after extra time";
  }

  return match.status || "locked";
}
