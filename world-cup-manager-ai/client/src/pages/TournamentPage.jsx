import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, Medal, RotateCcw, ShieldCheck, Table2, Trophy } from "lucide-react";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import { sampleTeams } from "../data/sampleData";
import { fetchTournament, startNewTournament } from "../services/gameService";
import { getErrorMessage } from "../services/api";

const tabs = [
  { key: "groupStage", label: "Group Stage", icon: Table2 },
  { key: "thirdPlace", label: "Third-Place Ranking", icon: ShieldCheck },
  { key: "knockout", label: "Knockout Bracket", icon: GitBranch },
  { key: "summary", label: "Final Summary", icon: Trophy },
];

const roundLabels = {
  roundOf32: "Round of 32",
  roundOf16: "Round of 16",
  quarterFinal: "Quarter Finals",
  semiFinal: "Semi Finals",
  thirdPlace: "Third Place Match",
  final: "Final",
};

const bracketRounds = ["roundOf32", "roundOf16", "quarterFinal", "semiFinal", "thirdPlace", "final"];
const defaultRouteToFinal = ["Group Stage", "Round of 32", "Round of 16", "Quarter Finals", "Semi Finals", "Final"];

function fallbackTournament() {
  const groups = sampleTeams.reduce((collection, team) => {
    const group = collection[team.group] || [];
    return { ...collection, [team.group]: [...group, team] };
  }, {});
  const table = Object.entries(groups).map(([group, teams]) => ({
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
  }));
  const thirdPlaceRanking = table.map((group, index) => ({
    ...group.rows[2],
    group: group.group,
    rank: index + 1,
    qualifies: index < 8,
  }));

  return {
    currentStage: "Group Stage",
    groupStageComplete: false,
    tournamentComplete: false,
    thirdPlaceRanking,
    selectedTeamStatus: null,
    routeToFinal: defaultRouteToFinal,
    awards: { completed: false, podium: {}, individual: {} },
    groupStage: {
      playedFixtures: 0,
      totalFixtures: 72,
      table,
    },
    knockout: {
      roundOf32: Array.from({ length: 16 }, (_, index) => ({
        id: `R32-${index + 1}`,
        homeSeed: `Qualifier ${index + 1}`,
        awaySeed: `Qualifier ${32 - index}`,
        status: "locked",
      })),
      roundOf16: Array.from({ length: 8 }, (_, index) => ({
        id: `R16-${index + 1}`,
        homeSeed: `Winner R32-${index * 2 + 1}`,
        awaySeed: `Winner R32-${index * 2 + 2}`,
        status: "locked",
      })),
      quarterFinal: Array.from({ length: 4 }, (_, index) => ({
        id: `QF-${index + 1}`,
        homeSeed: `Winner R16-${index * 2 + 1}`,
        awaySeed: `Winner R16-${index * 2 + 2}`,
        status: "locked",
      })),
      semiFinal: [
        { id: "SF-1", homeSeed: "Winner QF-1", awaySeed: "Winner QF-2", status: "locked" },
        { id: "SF-2", homeSeed: "Winner QF-3", awaySeed: "Winner QF-4", status: "locked" },
      ],
      thirdPlace: [{ id: "TP-1", homeSeed: "Loser SF-1", awaySeed: "Loser SF-2", status: "locked" }],
      final: [{ id: "F-1", homeSeed: "Winner SF-1", awaySeed: "Winner SF-2", status: "locked" }],
    },
  };
}

export default function TournamentPage() {
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState("groupStage");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

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

  const thirdPlaceQualifiedCodes = useMemo(
    () => new Set((tournament?.thirdPlaceRanking || []).filter((row) => row.qualifies).map((row) => row.teamCode)),
    [tournament],
  );
  const finalSummary = useMemo(() => getFinalSummary(tournament), [tournament]);

  async function handleStartNewTournament() {
    const confirmed = window.confirm("Start a new tournament? Career stats and tournament history will be kept.");
    if (!confirmed) return;

    setResetting(true);
    setResetError("");

    try {
      await startNewTournament();
      navigate("/select-team");
    } catch (requestError) {
      setResetError(getErrorMessage(requestError));
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <LoadingState label="Loading tournament..." />;

  return (
    <>
      <PageHeader
        title="Tournament"
        description="2026-style 48-team group stage, best third-place race, and simplified knockout bracket."
      />

      <TabNav activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === "groupStage" ? (
          <GroupStageTab tournament={tournament} thirdPlaceQualifiedCodes={thirdPlaceQualifiedCodes} />
        ) : null}
        {activeTab === "thirdPlace" ? <ThirdPlaceTab ranking={tournament.thirdPlaceRanking || []} /> : null}
        {activeTab === "knockout" ? <KnockoutTab tournament={tournament} /> : null}
        {activeTab === "summary" ? (
          <FinalSummaryTab
            tournament={tournament}
            finalSummary={finalSummary}
            onStartNewTournament={handleStartNewTournament}
            resetting={resetting}
            resetError={resetError}
          />
        ) : null}
      </div>
    </>
  );
}

function TabNav({ activeTab, onChange }) {
  return (
    <div className="overflow-x-auto">
      <div role="tablist" aria-label="Tournament sections" className="flex min-w-max gap-2 rounded-lg border border-white/10 bg-ink-850/70 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.key)}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition ${
                selected ? "bg-pitch-400 text-ink-950" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GroupStageTab({ tournament, thirdPlaceQualifiedCodes }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {tournament.groupStage.table.map((group) => (
        <Panel key={group.group} className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Group {group.group}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
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
                  <th className="py-3 pr-4">Pts</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {group.rows.map((row, index) => {
                  const status = getGroupQualificationStatus(row, index, tournament.groupStageComplete, thirdPlaceQualifiedCodes);

                  return (
                    <tr key={row.teamCode} className="text-slate-300">
                      <td className="py-3 pr-4 font-medium text-white">{row.teamName}</td>
                      <td className="py-3 pr-4">{row.played}</td>
                      <td className="py-3 pr-4">{row.wins}</td>
                      <td className="py-3 pr-4">{row.draws}</td>
                      <td className="py-3 pr-4">{row.losses}</td>
                      <td className="py-3 pr-4">{row.goalsFor}</td>
                      <td className="py-3 pr-4">{row.goalsAgainst}</td>
                      <td className="py-3 pr-4">{row.goalDifference}</td>
                      <td className="py-3 pr-4 font-semibold text-pitch-100">{row.points}</td>
                      <td className="py-3">
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function ThirdPlaceTab({ ranking }) {
  return (
    <Panel className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-pitch-400/12 text-pitch-200">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">Best Third-Place Ranking</h2>
          <p className="text-sm text-slate-400">Top eight third-placed teams qualify for the Round of 32.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="py-3 pr-4">Rank</th>
              <th className="py-3 pr-4">Team</th>
              <th className="py-3 pr-4">Group</th>
              <th className="py-3 pr-4">Pts</th>
              <th className="py-3 pr-4">GD</th>
              <th className="py-3 pr-4">GF</th>
              <th className="py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {ranking.map((row) => (
              <tr key={`${row.group}-${row.teamCode}`} className={row.qualifies ? "bg-pitch-400/[0.04] text-slate-200" : "text-slate-400"}>
                <td className="py-3 pr-4 font-semibold text-white">{row.rank}</td>
                <td className="py-3 pr-4 font-medium text-white">{row.teamName}</td>
                <td className="py-3 pr-4">Group {row.group}</td>
                <td className="py-3 pr-4 font-semibold text-pitch-100">{row.points}</td>
                <td className="py-3 pr-4">{row.goalDifference}</td>
                <td className="py-3 pr-4">{row.goalsFor}</td>
                <td className="py-3">
                  <StatusPill tone={row.qualifies ? "green" : "red"}>{row.qualifies ? "Qualified" : "Eliminated"}</StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function KnockoutTab({ tournament }) {
  return (
    <Panel className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-pitch-400/12 text-pitch-200">
          <GitBranch size={20} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">Knockout Bracket</h2>
          <p className="text-sm text-slate-400">{tournament.currentStage}</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1320px] grid-cols-6 gap-4">
          {bracketRounds.map((round) => (
            <div key={round}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{roundLabels[round]}</h3>
              <div className="space-y-3">
                {(tournament.knockout[round] || []).map((match) => (
                  <BracketMatch key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function FinalSummaryTab({ tournament, finalSummary, onStartNewTournament, resetting, resetError }) {
  if (finalSummary.completed) {
    return (
      <Panel className="p-5">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-pitch-400/12 text-pitch-200">
              <Trophy size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Tournament Complete</h2>
              <p className="text-sm text-slate-400">The final standings are confirmed.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onStartNewTournament}
            disabled={resetting}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-pitch-300/25 bg-pitch-400/10 px-4 py-2.5 text-sm font-semibold text-pitch-100 transition hover:bg-pitch-400/15 disabled:opacity-50"
          >
            <RotateCcw size={17} />
            {resetting ? "Resetting..." : "Start New Tournament"}
          </button>
        </div>

        {resetError ? <p className="mb-4 rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{resetError}</p> : null}

        <ChampionCelebration finalSummary={finalSummary} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile icon={Trophy} label="Champion" value={finalSummary.champion} tone="green" />
          <SummaryTile icon={Medal} label="Runner-up" value={finalSummary.runnerUp} />
          <SummaryTile icon={Medal} label="Third Place" value={finalSummary.thirdPlace} tone="green" />
          <SummaryTile icon={Medal} label="Fourth Place" value={finalSummary.fourthPlace} />
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Tournament Awards</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {getAwardItems(finalSummary.awards).map((award) => (
              <AwardTile key={award.key} title={award.title} award={award.award} />
            ))}
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-pitch-400/12 text-pitch-200">
          <Trophy size={20} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">Final Summary</h2>
          <p className="text-sm text-slate-400">{tournament.currentStage}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Manager Status</p>
          <p className="mt-3 text-lg font-semibold text-white">
            {tournament.selectedTeamStatus?.qualificationStatus || "No manager team selected"}
          </p>
          <p className="mt-2 text-sm text-slate-400">{tournament.progressText || tournament.currentStage}</p>
        </div>

        <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Remaining Path</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(tournament.routeToFinal?.length ? tournament.routeToFinal : defaultRouteToFinal).map((stage, index) => (
              <div key={`${stage}-${index}`} className="rounded-md bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-200">
                {stage}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ChampionCelebration({ finalSummary }) {
  const goldenBoot = finalSummary.awards?.goldenBoot;
  const bestPlayer = finalSummary.awards?.bestPlayer;
  const goldenGlove = finalSummary.awards?.goldenGlove;

  return (
    <div className="mb-5 rounded-lg border border-pitch-300/25 bg-gradient-to-br from-pitch-400/18 via-white/[0.055] to-ink-900 p-6 ring-1 ring-pitch-300/10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="grid h-14 w-14 place-items-center rounded-lg bg-pitch-400 text-ink-950 shadow-[0_0_30px_rgba(74,222,128,0.24)]">
            <Trophy size={31} />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-pitch-100">World Cup Champions</p>
          <h3 className="mt-2 text-4xl font-black tracking-normal text-white sm:text-5xl">{finalSummary.champion}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{formatChampionSentence(finalSummary)}</p>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3 lg:min-w-[460px]">
          <MiniSummary label="Runner-up" value={finalSummary.runnerUp} />
          <MiniSummary label="Third place" value={finalSummary.thirdPlace} />
          <MiniSummary label="Fourth place" value={finalSummary.fourthPlace} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <ChampionAward label="Golden Boot" award={goldenBoot} />
        <ChampionAward label="Best Player" award={bestPlayer} />
        <ChampionAward label="Golden Glove" award={goldenGlove} />
      </div>
    </div>
  );
}

function MiniSummary({ label, value }) {
  return (
    <div className="rounded-md border border-white/10 bg-ink-950/35 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-white">{value || "TBD"}</p>
    </div>
  );
}

function ChampionAward({ label, award }) {
  return (
    <div className="rounded-md border border-pitch-300/15 bg-pitch-400/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pitch-100">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{award?.name || "TBD"}</p>
      <p className="mt-1 text-sm text-slate-400">
        {award ? `${award.teamName} - ${award.value}` : "Award pending"}
      </p>
    </div>
  );
}

function BracketMatch({ match }) {
  const played = match.status === "played";

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm">
      <BracketTeam
        name={match.homeTeam || match.homeSeed}
        score={played ? match.score?.home : null}
        isWinner={match.winnerTeamCode && match.winnerTeamCode === match.homeTeamCode}
      />
      <div className="my-2 flex items-center justify-between gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
        <span>{match.id}</span>
        <StatusPill tone={played ? "green" : "slate"}>{played ? "Played" : "Scheduled"}</StatusPill>
      </div>
      <BracketTeam
        name={match.awayTeam || match.awaySeed}
        score={played ? match.score?.away : null}
        isWinner={match.winnerTeamCode && match.winnerTeamCode === match.awayTeamCode}
      />
      {formatResolutionLabel(match) ? <p className="mt-2 text-xs font-medium text-amber-200">{formatResolutionLabel(match)}</p> : null}
    </div>
  );
}

function BracketTeam({ name, score, isWinner }) {
  return (
    <div
      className={`flex min-h-9 items-center justify-between gap-2 rounded-md px-2 py-2 ${
        isWinner ? "bg-pitch-400/12 text-pitch-50 ring-1 ring-pitch-300/20" : "bg-white/[0.035] text-slate-300"
      }`}
    >
      <span className="truncate font-medium">{name}</span>
      <span className="font-semibold">{score ?? "-"}</span>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, tone = "slate" }) {
  const iconClass = tone === "green" ? "bg-pitch-400/12 text-pitch-100 ring-pitch-300/20" : "bg-white/[0.06] text-slate-300 ring-white/10";

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <span className={`grid h-10 w-10 place-items-center rounded-md ring-1 ${iconClass}`}>
        <Icon size={20} />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value || "TBD"}</p>
    </div>
  );
}

function AwardTile({ title, award }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-3 text-lg font-semibold text-white">{award?.name || "TBD"}</p>
      {award ? (
        <>
          <p className="mt-1 text-sm text-slate-400">
            {award.teamName} - {award.position}
          </p>
          <p className="mt-3 inline-flex rounded-md border border-pitch-300/20 bg-pitch-400/10 px-2 py-1 text-xs font-semibold text-pitch-100">
            {award.value || "TBD"}
          </p>
          <p className="mt-2 text-xs text-slate-500">{award.detail}</p>
        </>
      ) : null}
    </div>
  );
}

function StatusPill({ children, tone = "slate" }) {
  const toneClass =
    tone === "green"
      ? "border-pitch-300/20 bg-pitch-400/10 text-pitch-100"
      : tone === "amber"
        ? "border-amber-300/20 bg-amber-400/10 text-amber-100"
        : tone === "red"
          ? "border-red-300/20 bg-red-400/10 text-red-100"
          : "border-white/10 bg-white/[0.05] text-slate-300";

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function getGroupQualificationStatus(row, index, groupStageComplete, thirdPlaceQualifiedCodes) {
  if (index < 2) {
    return { label: "Qualified", tone: "green" };
  }

  if (index === 2) {
    if (groupStageComplete && thirdPlaceQualifiedCodes.has(row.teamCode)) {
      return { label: "Qualified", tone: "green" };
    }

    return groupStageComplete ? { label: "Eliminated", tone: "red" } : { label: "Third-place candidate", tone: "amber" };
  }

  return { label: "Eliminated", tone: "red" };
}

function formatResolutionLabel(match) {
  if (match.knockout?.resolution === "penalties" && match.knockout.penalties) {
    return `Penalties ${match.knockout.penalties.home}-${match.knockout.penalties.away}`;
  }

  if (match.knockout?.resolution === "extra-time") {
    return "After extra time";
  }

  return "";
}

function getWinnerFirstScore(match) {
  if (!match?.score || !match.winnerTeamCode) return null;
  const winnerIsHome = match.winnerTeamCode === match.homeTeamCode;
  return winnerIsHome ? `${match.score.home}-${match.score.away}` : `${match.score.away}-${match.score.home}`;
}

function getSentenceResolution(match) {
  if (match?.knockout?.resolution === "penalties" && match.knockout.penalties) {
    return ` on penalties (${match.knockout.penalties.home}-${match.knockout.penalties.away})`;
  }

  if (match?.knockout?.resolution === "extra-time") {
    return " after extra time";
  }

  return "";
}

function formatChampionSentence(finalSummary) {
  if (!finalSummary.champion || !finalSummary.runnerUp) {
    return "The 48-team tournament has completed through the final and third-place match.";
  }

  const score = finalSummary.finalScore ? ` ${finalSummary.finalScore}` : "";
  return `${finalSummary.champion} defeated ${finalSummary.runnerUp}${score} in the Final${finalSummary.finalResolution}.`;
}

function getFinalSummary(tournament) {
  const finalMatch = tournament?.knockout?.final?.[0];
  const thirdPlaceMatch = tournament?.knockout?.thirdPlace?.[0];
  const podium = tournament?.awards?.podium || {};

  return {
    completed: Boolean(tournament?.tournamentComplete && finalMatch?.status === "played" && thirdPlaceMatch?.status === "played"),
    champion: podium.champion || getWinnerName(finalMatch),
    runnerUp: podium.runnerUp || getLoserName(finalMatch),
    thirdPlace: podium.thirdPlace || getWinnerName(thirdPlaceMatch),
    fourthPlace: podium.fourthPlace || getLoserName(thirdPlaceMatch),
    finalScore: getWinnerFirstScore(finalMatch),
    finalResolution: getSentenceResolution(finalMatch),
    awards: tournament?.awards?.individual || {},
  };
}

function getAwardItems(awards = {}) {
  return [
    { key: "goldenBoot", title: "Golden Boot", award: awards.goldenBoot },
    { key: "mostAssists", title: "Most Assists", award: awards.mostAssists },
    { key: "goldenGlove", title: "Golden Glove", award: awards.goldenGlove },
    { key: "bestPlayer", title: "Best Player", award: awards.bestPlayer },
    { key: "bestYoungPlayer", title: "Best Young Player", award: awards.bestYoungPlayer },
  ];
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
