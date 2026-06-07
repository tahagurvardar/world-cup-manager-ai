import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BadgeAlert, Crosshair, HeartPulse, Play, Square, Star, Swords, Timer, Trophy, UserCog } from "lucide-react";
import Flag from "../components/Flag.jsx";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import { fallbackDashboard } from "../data/sampleData";
import { fetchDashboard, simulateMatch } from "../services/gameService";
import { getErrorMessage } from "../services/api";
import { routeIdFromSimId } from "../utils/player";

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
  const goalEvents = match ? getGoalEvents(match) : [];
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
        icon={Swords}
        title="Match Center"
        description="Play the next group matchday or knockout round, highlight your fixture, and review the other results from the same stage."
        action={
          <button type="button" onClick={handleSimulate} disabled={simulating || !canSimulate} className="btn-primary">
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
                <FixtureTeam name={dashboard.nextMatch.homeTeam} flag={dashboard.nextMatch.homeFlag} align="right" />
                <span className="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-300">vs</span>
                <FixtureTeam name={dashboard.nextMatch.awayTeam} flag={dashboard.nextMatch.awayFlag} />
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
                <div className="mt-3 flex flex-wrap items-center gap-3 text-3xl font-semibold text-white">
                  <TeamInline team={match.teams.home} size="md" />
                  <span>{formatResult(match)}</span>
                  <TeamInline team={match.teams.away} size="md" />
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">{resultRoundLabel}</p>
                <p className="mt-3 text-sm text-pitch-100">{simulation.headline}</p>
              </div>

              {simulation.lineupChanges?.length ? (
                <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/[0.08] p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                    <UserCog size={16} className="text-amber-300" /> Forced lineup changes
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {simulation.lineupChanges.map((change) => (
                      <p key={`${change.out}-${change.in}`} className="text-sm text-slate-200">
                        <span className="font-medium text-white">{change.inName}</span> replaced <span className="text-slate-400 line-through">{change.outName}</span> at {change.position}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric icon={Activity} label="Possession" value={`${match.stats.possession.home}% - ${match.stats.possession.away}%`} />
                <Metric icon={Crosshair} label="xG" value={`${match.stats.xG.home} - ${match.stats.xG.away}`} />
                <Metric icon={BadgeAlert} label="Yellow cards" value={`${match.stats.yellowCards.home} - ${match.stats.yellowCards.away}`} />
                <Metric icon={Star} label="Man of Match" value={formatManOfTheMatch(match.manOfTheMatch)} />
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
                <GoalSummary events={goalEvents} />
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
                <div className="xl:col-span-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Timeline</h3>
                  <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-2">
                    {match.events.map((event, index) => (
                      <div key={`${event.minute}-${event.description}-${index}`} className={`flex gap-3 rounded-md p-3 text-sm ${timelineRowClass(event.type)}`}>
                        <span className="flex items-center gap-1 font-semibold text-pitch-100">
                          <TimelineIcon type={event.type} />
                          {event.minute}'
                        </span>
                        <p className="text-slate-300">{event.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <PlayerRatings match={match} />

              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {match.stage === "group" ? "Other Matchday Results" : "Other Round Results"}
                </h3>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {(simulation.otherResults || []).map((result) => (
                    <div key={result.fixtureId} className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2 font-semibold text-white">
                        <TeamInline team={result.teams.home} size="sm" />
                        <span>{formatResult(result)}</span>
                        <TeamInline team={result.teams.away} size="sm" />
                      </div>
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

function getGoalEvents(match) {
  return (match.events || []).filter((event) => event.type === "goal" || event.type === "extra-time-goal" || event.type === "own-goal");
}

function formatManOfTheMatch(manOfTheMatch) {
  if (!manOfTheMatch) return "TBD";
  return `${manOfTheMatch.name} (${manOfTheMatch.rating})`;
}

function GoalSummary({ events }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Scorers</h3>
      {events.length ? (
        <div className="mt-3 space-y-2">
          {events.map((event, index) => (
            <div key={`${event.minute}-${event.scorer?.id || event.player}-${index}`} className="rounded-md bg-white/[0.04] p-3 text-sm">
              <p className="font-semibold text-white">
                {event.minute}' {event.scorer?.name || event.player}
              </p>
              <p className="mt-1 text-slate-400">
                {event.team}
                {event.assister ? ` - assist: ${event.assister.name}` : " - unassisted"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md bg-white/[0.04] p-3 text-sm text-slate-400">No goals in this match.</p>
      )}
    </div>
  );
}

function FixtureTeam({ name, flag, align = "left" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "justify-end" : ""}`}>
      {align === "right" ? <span className="truncate text-xl font-semibold text-white">{name}</span> : null}
      <Flag src={flag} alt={`${name} flag`} size="md" />
      {align !== "right" ? <span className="truncate text-xl font-semibold text-white">{name}</span> : null}
    </div>
  );
}

function TeamInline({ team, size = "sm" }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Flag src={team?.flag} alt={`${team?.name || "Team"} flag`} size={size} />
      <span>{team?.name || "TBD"}</span>
    </span>
  );
}

function PlayerRatings({ match }) {
  const homeRatings = getTeamRatings(match, match.teams.home.code);
  const awayRatings = getTeamRatings(match, match.teams.away.code);

  if (!homeRatings.length && !awayRatings.length) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Player Ratings</h3>
      <div className="mt-3 grid gap-4 xl:grid-cols-2">
        <RatingsTable title={match.teams.home.name} ratings={homeRatings} />
        <RatingsTable title={match.teams.away.name} ratings={awayRatings} />
      </div>
    </div>
  );
}

function RatingsTable({ title, ratings }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <h4 className="font-semibold text-white">{title}</h4>
      <div className="mt-3 max-h-[380px] overflow-y-auto pr-1">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="pb-2 pr-3">Player</th>
              <th className="pb-2 pr-3">Pos</th>
              <th className="pb-2 pr-3">G</th>
              <th className="pb-2 pr-3">A</th>
              <th className="pb-2 text-right">Rat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {ratings.map((rating) => (
              <tr key={rating.playerId} className="transition hover:bg-white/[0.03]">
                <td className="py-2 pr-3 font-medium text-white">
                  <PlayerLink simId={rating.playerId} name={rating.name} />
                </td>
                <td className="py-2 pr-3 text-slate-400">{rating.position}</td>
                <td className="py-2 pr-3 text-slate-300">{rating.goals}</td>
                <td className="py-2 pr-3 text-slate-300">{rating.assists}</td>
                <td className="py-2 text-right">
                  <span className={`inline-grid min-w-[2.4rem] place-items-center rounded-md px-2 py-0.5 text-xs font-bold ${ratingClass(rating.rating)}`}>
                    {rating.rating.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerLink({ simId, name }) {
  const routeId = routeIdFromSimId(simId);
  if (!routeId) return <span>{name}</span>;
  return (
    <Link to={`/player/${routeId}`} className="transition hover:text-pitch-100 hover:underline">
      {name}
    </Link>
  );
}

function TimelineIcon({ type }) {
  if (type === "injury") return <HeartPulse size={15} className="text-red-300" />;
  if (type === "red-card") return <Square size={13} className="fill-red-500 text-red-500" />;
  if (type === "yellow-card") return <Square size={13} className="fill-amber-400 text-amber-400" />;
  return <Timer size={15} />;
}

function timelineRowClass(type) {
  if (type === "injury") return "border border-red-400/20 bg-red-500/[0.06]";
  if (type === "red-card") return "border border-red-400/20 bg-red-500/[0.06]";
  return "bg-white/[0.04]";
}

function ratingClass(rating) {
  if (rating >= 8) return "bg-pitch-500/25 text-pitch-100 ring-1 ring-pitch-400/30";
  if (rating >= 7) return "bg-emerald-500/15 text-emerald-200";
  if (rating >= 6) return "bg-amber-400/15 text-amber-200";
  return "bg-red-500/15 text-red-200";
}

function getTeamRatings(match, teamCode) {
  return (match.playerRatings || [])
    .filter((rating) => rating.teamCode === teamCode)
    .sort((a, b) => b.rating - a.rating || b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name));
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
