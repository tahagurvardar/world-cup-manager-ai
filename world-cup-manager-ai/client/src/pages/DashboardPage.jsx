import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, CalendarDays, Gauge, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import StatCard from "../components/StatCard.jsx";
import { fallbackDashboard } from "../data/sampleData";
import { fetchDashboard } from "../services/gameService";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchDashboard()
      .then((data) => {
        if (isMounted) setDashboard(data);
      })
      .catch(() => {
        if (isMounted) setDashboard(fallbackDashboard);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const radarData = useMemo(() => {
    if (!dashboard?.selectedTeam) return [];
    return [
      { metric: "Overall", value: dashboard.selectedTeam.overall },
      { metric: "Morale", value: dashboard.morale },
      { metric: "Form", value: dashboard.form },
      { metric: "Pressing", value: dashboard.tactics?.pressing === "high" ? 88 : dashboard.tactics?.pressing === "low" ? 62 : 74 },
      { metric: "Tempo", value: dashboard.tactics?.tempo === "fast" ? 86 : dashboard.tactics?.tempo === "slow" ? 60 : 72 },
    ];
  }, [dashboard]);

  if (loading) return <LoadingState />;

  if (dashboard?.needsTeamSelection) {
    return (
      <Panel className="p-6">
        <h1 className="text-2xl font-semibold text-white">Select a national team</h1>
        <p className="mt-2 text-sm text-slate-400">Your manager profile is ready, but no country has been assigned yet.</p>
      </Panel>
    );
  }

  const statusLabel = dashboard.qualificationStatus?.includes("automatic")
    ? "Top 2"
    : dashboard.qualificationStatus?.includes("third-place")
      ? "3rd race"
      : dashboard.qualificationStatus?.includes("Champions")
        ? "Champions"
        : dashboard.qualificationStatus?.includes("Runners")
          ? "Runner-up"
          : dashboard.qualificationStatus?.includes("Alive")
            ? "Alive"
            : dashboard.qualificationStatus?.includes("Eliminated")
          ? "Out"
          : "Chase";
  const nextOpponentName = dashboard.nextOpponent?.name || getNextOpponentName(dashboard.nextMatch, dashboard.selectedTeam.code);
  const routeToFinal = dashboard.routeToFinal?.length ? dashboard.routeToFinal : ["Group Stage", "Round of 32", "Final"];
  const stageCardValue = formatStageForCard(dashboard.tournamentStage);
  const managerCareer = getManagerCareer(dashboard.managerCareer);

  return (
    <>
      <PageHeader
        title={`${dashboard.selectedTeam.name} Dashboard`}
        description="Tournament command center for squad condition, next match context, AI tactical advice, and recent progress."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Team Overall" value={dashboard.selectedTeam.overall} detail={dashboard.selectedTeam.style} icon={Gauge} />
        <StatCard label="Current Stage" value={stageCardValue} detail={`Group ${dashboard.selectedTeam.group} - Position ${dashboard.groupPosition || "TBD"}`} icon={TrendingUp} />
        <StatCard label="Next Opponent" value={nextOpponentName || "TBD"} detail={dashboard.tournamentProgress} icon={CalendarDays} tone="amber" />
        <StatCard label="Qualification" value={statusLabel} detail={dashboard.qualificationStatus} icon={ShieldCheck} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-pitch-400/12 text-pitch-200">
              <BrainCircuit size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Tactical Advice</h2>
              <p className="text-sm text-slate-400">Rule-based placeholder ready for an OpenAI or local LLM adapter.</p>
            </div>
          </div>
          <p className="mt-5 rounded-md border border-pitch-300/15 bg-pitch-400/10 p-4 text-sm leading-6 text-pitch-50">
            {dashboard.aiAdvice.recommendedApproach}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <AdviceList title="Opponent strengths" items={dashboard.aiAdvice.opponentStrengths} />
            <AdviceList title="Opponent weaknesses" items={dashboard.aiAdvice.opponentWeaknesses} />
            <AdviceList title="Danger players" items={dashboard.aiAdvice.dangerPlayers} />
            <AdviceList title="Key tactical advice" items={dashboard.aiAdvice.keyTacticalAdvice} />
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Team Shape</h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Radar dataKey="value" stroke="#4ade80" fill="#22c55e" fillOpacity={0.22} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-white">Manager Record</h2>
            <p className="mt-3 text-2xl font-black text-white">
              {managerCareer.wins}W - {managerCareer.draws}D - {managerCareer.losses}L
            </p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <RecordItem label="Win Rate" value={`${managerCareer.winRate}%`} />
              <RecordItem label="Goals" value={`${managerCareer.goalsFor}-${managerCareer.goalsAgainst}`} />
              <RecordItem label="Best Finish" value={managerCareer.bestTournamentFinish} />
              <RecordItem label="Trophies Won" value={managerCareer.trophiesWon} />
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-white">Route to Final</h2>
            <div className="mt-4 space-y-2">
              {routeToFinal.map((stage, index) => (
                <div key={`${stage}-${index}`} className="flex items-center gap-3 rounded-md bg-white/[0.04] px-3 py-3">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-pitch-400/12 text-sm font-semibold text-pitch-100">
                    {index + 1}
                  </span>
                  <p className="font-medium text-white">{stage}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <UsersRound size={19} className="text-pitch-200" />
              <h2 className="text-lg font-semibold text-white">Key Players</h2>
            </div>
            <div className="space-y-3">
              {dashboard.keyPlayers.map((player) => (
                <div key={`${player.name}-${player.position}`} className="flex items-center justify-between rounded-md bg-white/[0.04] px-3 py-3">
                  <div>
                    <p className="font-medium text-white">{player.name}</p>
                    <p className="text-sm text-slate-400">{player.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-pitch-100">{player.overall}</p>
                    <p className="text-xs text-slate-500">Form {player.form}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Recent Results</h2>
          {dashboard.recentResults.length ? (
            <div className="mt-4 space-y-3">
              {dashboard.recentResults.map((result) => (
                <div key={result.fixtureId} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold text-white">
                    {result.teams.home.name} {result.score.home}-{result.score.away} {result.teams.away.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {result.stageName || `Group ${result.group}, Matchday ${result.matchday}`}
                  </p>
                  {result.manOfTheMatch ? (
                    <p className="mt-2 text-sm text-pitch-100">
                      Man of the Match: {result.manOfTheMatch.name} ({result.manOfTheMatch.rating})
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
              No matches played yet. Use Match Center to simulate the next global matchday.
            </p>
          )}

          {dashboard.latestNews?.length ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Latest News</h3>
              <div className="mt-3 space-y-3">
                {dashboard.latestNews.map((item) => (
                  <div key={item.id} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                    <p className="font-semibold text-white">{item.headline}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </>
  );
}

function getNextOpponentName(nextMatch, selectedTeamCode) {
  if (!nextMatch || !selectedTeamCode) return null;
  return nextMatch.homeTeamCode === selectedTeamCode || nextMatch.homeTeam === selectedTeamCode
    ? nextMatch.awayTeam
    : nextMatch.homeTeam;
}

function formatStageForCard(stage) {
  if (!stage) return "TBD";
  return stage.replace("Group Stage - Matchday", "Group MD");
}

function getManagerCareer(career = {}) {
  return {
    gamesManaged: career.gamesManaged || 0,
    wins: career.wins || 0,
    draws: career.draws || 0,
    losses: career.losses || 0,
    goalsFor: career.goalsFor || 0,
    goalsAgainst: career.goalsAgainst || 0,
    winRate: career.winRate || 0,
    bestTournamentFinish: career.bestTournamentFinish || "Not started",
    trophiesWon: career.trophiesWon || 0,
  };
}

function RecordItem({ label, value }) {
  return (
    <div className="rounded-md bg-white/[0.04] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function AdviceList({ title, items }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-white/[0.04] px-3 py-2 text-sm text-slate-200">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
