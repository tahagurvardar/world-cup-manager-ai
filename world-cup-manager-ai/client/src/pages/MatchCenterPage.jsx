import { useEffect, useState } from "react";
import { Activity, BadgeAlert, Crosshair, Play, Timer, Trophy } from "lucide-react";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import { fallbackDashboard } from "../data/sampleData";
import { fetchDashboard, simulateMatch } from "../services/gameService";
import { getErrorMessage } from "../services/api";

export default function MatchCenterPage() {
  const [dashboard, setDashboard] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState("");

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

  async function handleSimulate() {
    setSimulating(true);
    setError("");

    try {
      const data = await simulateMatch();
      setSimulation(data);
      setDashboard(data.dashboard);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSimulating(false);
    }
  }

  if (loading) return <LoadingState label="Preparing match center..." />;

  const match = simulation?.match;
  const report = simulation?.report;
  const canSimulate = dashboard?.canSimulate ?? Boolean(dashboard?.nextMatch);
  const activeRoundLabel = dashboard?.nextMatch?.stageName || dashboard?.nextKnockoutRound?.stageName;
  const isKnockoutContext = Boolean(activeRoundLabel && activeRoundLabel !== "Group Stage");
  const simulateLabel =
    dashboard?.tournamentStage === "Tournament Complete"
      ? "Tournament Complete"
      : isKnockoutContext
        ? "Simulate Round"
        : "Simulate Matchday";
  const resultRoundLabel = match?.stageName || (match?.globalMatchday ? `Global Matchday ${match.globalMatchday}` : "Match Result");

  return (
    <>
      <PageHeader
        title="Match Center"
        description="Play the next group matchday or knockout round, highlight your fixture, and review the other results from the same stage."
        action={
          <button
            type="button"
            onClick={handleSimulate}
            disabled={simulating || !canSimulate}
            className="inline-flex items-center gap-2 rounded-md bg-pitch-400 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-pitch-300 disabled:opacity-50"
          >
            <Play size={18} />
            {simulating ? "Simulating..." : simulateLabel}
          </button>
        }
      />

      {error ? <p className="mb-4 rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Next Fixture</h2>
          {dashboard?.nextMatch ? (
            <div className="mt-5 rounded-lg border border-pitch-300/20 bg-pitch-400/10 p-5 text-center">
              <p className="text-sm uppercase tracking-[0.18em] text-pitch-200">
                {dashboard.nextMatch.stageName || `Global Matchday ${dashboard.nextMatch.globalMatchday || dashboard.currentGlobalMatchday}`}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                {dashboard.nextMatch.group ? `Group ${dashboard.nextMatch.group}` : dashboard.nextMatch.id}
              </p>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <p className="text-xl font-semibold text-white">{dashboard.nextMatch.homeTeam}</p>
                <span className="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-300">vs</span>
                <p className="text-xl font-semibold text-white">{dashboard.nextMatch.awayTeam}</p>
              </div>
              <p className="mt-4 text-sm text-slate-400">{dashboard.nextMatch.venue || "Tournament stadium"}</p>
            </div>
          ) : (
            <p className="mt-4 rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
              {canSimulate
                ? `${dashboard?.nextKnockoutRound?.stageName || "Next knockout round"} is ready, but your team has no fixture in it.`
                : "No remaining fixtures."}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Stage" value={dashboard?.tournamentStage} />
            <Metric label="Status" value={dashboard?.qualificationStatus} />
            <Metric label="Formation" value={dashboard?.tactics?.formation} />
            <Metric label="Mentality" value={dashboard?.tactics?.mentality} />
            <Metric label="Pressing" value={dashboard?.tactics?.pressing} />
            <Metric label="Tempo" value={dashboard?.tactics?.tempo} />
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Result</h2>
          {match ? (
            <div className="mt-5">
              <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Full time</p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {match.teams.home.name} {formatResult(match)} {match.teams.away.name}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">{resultRoundLabel}</p>
                <p className="mt-3 text-sm text-pitch-100">{simulation.headline}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Metric icon={Activity} label="Possession" value={`${match.stats.possession.home}% - ${match.stats.possession.away}%`} />
                <Metric icon={Crosshair} label="xG" value={`${match.stats.xG.home} - ${match.stats.xG.away}`} />
                <Metric icon={BadgeAlert} label="Yellow cards" value={`${match.stats.yellowCards.home} - ${match.stats.yellowCards.away}`} />
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">AI Match Report</h3>
                  <div className="mt-3 space-y-3 text-sm text-slate-300">
                    <ReportRow label="Summary" value={report.shortSummary} />
                    <ReportRow label="Tactical analysis" value={report.tacticalAnalysis} />
                    <ReportRow label="Turning point" value={report.keyTurningPoint} />
                    <ReportRow label="Best player" value={report.bestPlayer} />
                    <ReportRow label="Improve" value={report.improveBeforeNextMatch} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Timeline</h3>
                  <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-2">
                    {match.events.map((event, index) => (
                      <div key={`${event.minute}-${event.description}-${index}`} className="flex gap-3 rounded-md bg-white/[0.04] p-3 text-sm">
                        <span className="flex items-center gap-1 font-semibold text-pitch-100">
                          <Timer size={15} />
                          {event.minute}'
                        </span>
                        <p className="text-slate-300">{event.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {match.stage === "group" ? "Other Matchday Results" : "Other Round Results"}
                </h3>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {(simulation.otherResults || []).map((result) => (
                    <div key={result.fixtureId} className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm">
                      <p className="font-semibold text-white">
                        {result.teams.home.name} {formatResult(result)} {result.teams.away.name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
                        {result.stageName || `Group ${result.group}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid min-h-[340px] place-items-center rounded-lg border border-dashed border-white/[0.12] bg-white/[0.025]">
              <div className="text-center">
                <Trophy className="mx-auto text-pitch-200" size={36} />
                <p className="mt-4 text-sm text-slate-400">The next match report will appear here.</p>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

function formatResult(match) {
  const baseScore = `${match.score.home}-${match.score.away}`;

  if (match.knockout?.resolution === "penalties" && match.knockout.penalties) {
    return `${baseScore} (${match.knockout.penalties.home}-${match.knockout.penalties.away} pens)`;
  }

  if (match.knockout?.resolution === "extra-time") {
    return `${baseScore} AET`;
  }

  return baseScore;
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
        {Icon ? <Icon size={15} /> : null}
        {label}
      </p>
      <p className="mt-2 font-semibold capitalize text-white">{value || "TBD"}</p>
    </div>
  );
}

function ReportRow({ label, value }) {
  return (
    <div className="rounded-md bg-white/[0.04] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 leading-6 text-slate-200">{value}</p>
    </div>
  );
}
