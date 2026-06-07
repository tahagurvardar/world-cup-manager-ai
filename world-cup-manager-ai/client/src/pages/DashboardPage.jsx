import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Ban,
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  Flame,
  Gauge,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Goal,
  HeartPulse,
  Medal,
  Mic,
  Play,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
  UsersRound,
} from "lucide-react";
import Flag from "../components/Flag.jsx";
import FormDots from "../components/FormDots.jsx";
import LoadingState from "../components/LoadingState.jsx";
import Panel from "../components/Panel.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import StatCard from "../components/StatCard.jsx";
import TacticalPitch from "../components/TacticalPitch.jsx";
import TournamentProgress from "../components/TournamentProgress.jsx";
import { fallbackDashboard } from "../data/sampleData";
import { fetchDashboard } from "../services/gameService";
import { playerRoute } from "../utils/player";

const DEF_POS = new Set(["GK", "CB", "RB", "LB"]);
const MID_POS = new Set(["DM", "CM", "AM"]);
const ATT_POS = new Set(["ST", "LW", "RW"]);

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  if (loading) return <LoadingState />;

  if (dashboard?.needsTeamSelection) {
    return (
      <Panel className="p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pitch-400/15 text-pitch-100">
          <ShieldCheck size={26} />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-white">Select a national team</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">Your manager profile is ready. Choose a country to unlock the dashboard, squad, tactics, and match center.</p>
        <button type="button" onClick={() => navigate("/select-team")} className="btn-primary mx-auto mt-6">
          Choose your nation
          <ChevronRight size={16} />
        </button>
      </Panel>
    );
  }

  const team = dashboard.selectedTeam;
  const startingXI = dashboard.startingXI || [];
  const units = computeUnits(startingXI, team.overall);
  const morale = moraleStatus(dashboard.morale);
  const formResults = computeForm(dashboard.recentResults, team.code);
  const nextOpponentName = dashboard.nextOpponent?.name || getNextOpponentName(dashboard.nextMatch, team.code);
  const confidence = computeConfidence(team.overall, dashboard.nextOpponent?.overall, dashboard.morale, dashboard.form);
  const managerCareer = getManagerCareer(dashboard.managerCareer);
  const stageLabel = formatStageForCard(dashboard.tournamentStage);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="glass-card animate-fade-in-up flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Flag src={team.flag} alt={`${team.name} flag`} size="xl" />
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">{team.name}</h1>
            <p className="mt-1 text-sm text-slate-400">
              Group {team.group} · {team.style} · {team.confederation}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip border-pitch-300/25 bg-pitch-400/10 text-pitch-100">
            <Trophy size={13} /> {stageLabel}
          </span>
          <span className="chip">{dashboard.qualificationStatus}</span>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Team Overall" value={dashboard.lineupOverall || team.overall} icon={Gauge} className="animate-fade-in-up">
          <div className="space-y-1.5">
            <UnitBar label="ATT" value={units.attack} tone="green" />
            <UnitBar label="MID" value={units.midfield} tone="blue" />
            <UnitBar label="DEF" value={units.defense} tone="amber" />
          </div>
          <p className="mt-2 text-xs text-slate-400">Selected XI · base nation {team.overall}</p>
        </StatCard>

        <StatCard label="Morale" value={morale.label} icon={Flame} tone={morale.tone} className="animate-fade-in-up animate-delay-1">
          <ProgressBar value={dashboard.morale} tone={morale.tone} showValue={false} label="" />
          <p className="mt-2 text-xs text-slate-400">Squad is {morale.label.toLowerCase()} and motivated.</p>
        </StatCard>

        <StatCard label="Recent Form" value={`${formResults.filter((r) => r === "W").length}W`} icon={Activity} className="animate-fade-in-up animate-delay-2">
          <FormDots results={formResults} />
          <p className="mt-2 text-xs text-slate-400">Last {Math.min(5, formResults.length) || 5} matches</p>
        </StatCard>

        <StatCard label="FIFA Ranking" value={team.fifaRanking ? `#${team.fifaRanking}` : "—"} icon={TrendingUp} tone="blue" className="animate-fade-in-up animate-delay-3">
          <p className="text-xs text-slate-400">Ranked by squad overall across all 48 nations.</p>
        </StatCard>

        <StatCard label="Tournament" value={stageLabel} icon={Trophy} tone="amber" className="animate-fade-in-up animate-delay-4">
          <p className="text-xs text-slate-400">Best finish: <span className="font-semibold text-white">{managerCareer.bestTournamentFinish}</span></p>
        </StatCard>
      </div>

      {/* Tactical + Next match */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="p-5">
          <SectionHeader icon={BrainCircuit} title="AI Tactical Advice" subtitle="Rule-based engine — ready for an LLM adapter" action={<button type="button" onClick={() => navigate("/tactics")} className="text-xs font-semibold text-pitch-200 hover:text-pitch-100">View Tactics →</button>} />
          <div className="mt-5 grid gap-5 md:grid-cols-[280px_1fr]">
            <TacticalPitch formation={dashboard.formation || dashboard.tactics?.formation || "4-3-3"} startingXI={startingXI} subtitle={`${dashboard.tactics?.formation || ""} setup`} captainPlayerIndex={dashboard.captainIndex} vicePlayerIndex={dashboard.viceCaptainIndex} />
            <div className="space-y-4">
              <Advice label="Game Plan" icon={Target}>{dashboard.aiAdvice.recommendedApproach}</Advice>
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <ShieldCheck size={14} /> Key Instructions
                </p>
                <ul className="mt-2 space-y-1.5">
                  {(dashboard.aiAdvice.keyTacticalAdvice || []).slice(0, 3).map((item) => (
                    <li key={item} className="flex gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-slate-200">
                      <ChevronRight size={15} className="mt-0.5 shrink-0 text-pitch-300" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-pitch-300/15 bg-pitch-400/[0.06] p-3">
                <ProgressBar label="AI Confidence" value={confidence} tone="green" suffix="%" />
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col p-5">
          <SectionHeader icon={CalendarDays} title="Next Match" subtitle={dashboard.nextMatch?.stageName || (dashboard.nextMatch?.group ? `Group ${dashboard.nextMatch.group}` : "Awaiting fixture")} />
          {dashboard.nextMatch ? (
            <>
              <div className="mt-5 grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <MatchSide name={dashboard.nextMatch.homeTeam} flag={dashboard.nextMatch.homeFlag} />
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xs font-bold text-slate-300">VS</span>
                <MatchSide name={dashboard.nextMatch.awayTeam} flag={dashboard.nextMatch.awayFlag} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <InfoPill label="Stadium" value={dashboard.nextMatch.stadiumName || dashboard.nextMatch.venue || "Tournament stadium"} />
                <InfoPill label="City" value={formatLocation(dashboard.nextMatch)} />
                <InfoPill label="Weather" value={formatWeather(dashboard.nextMatch.weather)} />
                <InfoPill label="Round" value={dashboard.nextMatch.stageName || `Matchday ${dashboard.nextMatch.globalMatchday || dashboard.currentGlobalMatchday || 1}`} />
              </div>
              <button type="button" onClick={() => navigate("/match-center")} className="btn-primary mt-4 w-full py-3 text-base uppercase tracking-wide">
                <Play size={18} /> Simulate Match
              </button>
            </>
          ) : (
            <div className="mt-5 grid flex-1 place-items-center rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
              {nextOpponentName ? `Next opponent: ${nextOpponentName}` : "No upcoming fixture. Head to Match Center for the next round."}
            </div>
          )}
        </Panel>
      </div>

      {/* Squad form + recent results */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="p-5">
          <SectionHeader icon={UsersRound} title="Squad Form" subtitle="Most important players" action={<button type="button" onClick={() => navigate("/squad")} className="text-xs font-semibold text-pitch-200 hover:text-pitch-100">View Squad →</button>} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="pb-3 pr-3">#</th>
                  <th className="pb-3 pr-3">Name</th>
                  <th className="pb-3 pr-3">Pos</th>
                  <th className="pb-3 pr-3">OVR</th>
                  <th className="pb-3 pr-3">Form</th>
                  <th className="pb-3">Morale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {dashboard.keyPlayers.map((player, index) => (
                  <tr
                    key={`${player.teamCode || team.code}-${player.index ?? index}`}
                    onClick={() => player.index != null && navigate(playerRoute(player.teamCode || team.code, player.index))}
                    className="cursor-pointer text-slate-300 transition hover:bg-white/[0.03]"
                  >
                    <td className="py-2.5 pr-3 font-semibold text-slate-500">{index + 1}</td>
                    <td className="py-2.5 pr-3 font-medium text-white hover:text-pitch-100">{player.name}</td>
                    <td className="py-2.5 pr-3"><PosBadge position={player.position} /></td>
                    <td className="py-2.5 pr-3 font-bold text-pitch-100">{player.overall}</td>
                    <td className="py-2.5 pr-3"><MiniBar value={player.form} /></td>
                    <td className="py-2.5"><MiniBar value={player.morale} tone="amber" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionHeader icon={Goal} title="Recent Results" />
          {dashboard.recentResults.length ? (
            <div className="mt-4 space-y-2.5">
              {dashboard.recentResults.map((result) => (
                <div key={result.fixtureId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-pitch-300/20">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                    <TeamNameWithFlag team={result.teams.home} />
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-pitch-100">{result.score.home}-{result.score.away}</span>
                    <TeamNameWithFlag team={result.teams.away} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{result.stageName || `Group ${result.group}, Matchday ${result.matchday}`}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">No matches played yet.</p>
          )}
        </Panel>
      </div>

      {/* Squad availability */}
      <Panel className="p-5">
        <SectionHeader icon={HeartPulse} title="Squad Availability" subtitle="Injuries and suspensions for your squad" action={<button type="button" onClick={() => navigate("/squad")} className="text-xs font-semibold text-pitch-200 hover:text-pitch-100">Manage Squad →</button>} />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-pitch-300/20 bg-pitch-400/[0.06] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pitch-200">Available</p>
            <p className="mt-1 text-3xl font-black text-white">{dashboard.squadAvailability?.available ?? "—"}</p>
            <p className="text-xs text-slate-400">of {dashboard.squadAvailability?.total ?? 25} players</p>
          </div>
          <AvailabilityList title="Injured" tone="red" icon={HeartPulse} items={dashboard.squadAvailability?.injured} teamCode={team.code} onOpen={(index) => navigate(playerRoute(team.code, index))} />
          <AvailabilityList title="Suspended" tone="amber" icon={Ban} items={dashboard.squadAvailability?.suspended} teamCode={team.code} onOpen={(index) => navigate(playerRoute(team.code, index))} />
        </div>
      </Panel>

      {/* Media & confidence */}
      {dashboard.media ? (
        <Panel className="p-5">
          <SectionHeader
            icon={Mic}
            title="Media & Confidence"
            subtitle="Shaped by your press conferences"
            action={
              <button type="button" onClick={() => navigate("/press-conference")} className="text-xs font-semibold text-pitch-200 hover:text-pitch-100">
                {dashboard.pressConferencePending ? "Conference waiting →" : "Press Room →"}
              </button>
            }
          />
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <MediaCard label="Fan Confidence" value={dashboard.media.fanConfidence} trend={dashboard.media.trends?.fanConfidence} tone="green" />
            <MediaCard label="Media Pressure" value={dashboard.media.mediaPressure} trend={dashboard.media.trends?.mediaPressure} tone="amber" invert />
            <MediaCard label="Board Confidence" value={dashboard.media.boardConfidence} trend={dashboard.media.trends?.boardConfidence} tone="blue" />
          </div>
        </Panel>
      ) : null}

      {/* Manager record + Route + News */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-5">
          <SectionHeader icon={Medal} title="Manager Record" />
          <p className="mt-3 text-2xl font-black text-white">{managerCareer.wins}W · {managerCareer.draws}D · {managerCareer.losses}L</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <RecordItem label="Win Rate" value={`${managerCareer.winRate}%`} />
            <RecordItem label="Goals" value={`${managerCareer.goalsFor}-${managerCareer.goalsAgainst}`} />
            <RecordItem label="Best Finish" value={managerCareer.bestTournamentFinish} />
            <RecordItem label="Trophies" value={managerCareer.trophiesWon} />
            <RecordItem label="Reputation" value={`${managerCareer.reputation}/100`} />
          </div>
          {dashboard.lastTournamentWon && dashboard.latestAchievement ? (
            <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-400/10 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100">Latest Achievement</p>
              <p className="mt-1 font-semibold text-white">{dashboard.latestAchievement.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{dashboard.latestAchievement.description}</p>
            </div>
          ) : null}
        </Panel>

        <Panel className="p-5">
          <SectionHeader icon={Target} title="Route to Final" />
          <div className="mt-4 space-y-2">
            {(dashboard.routeToFinal?.length ? dashboard.routeToFinal : ["Group Stage", "Round of 32", "Final"]).map((stage, index) => (
              <div key={`${stage}-${index}`} className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-pitch-400/15 text-xs font-bold text-pitch-100">{index + 1}</span>
                <p className="text-sm font-medium text-white">{stage}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionHeader icon={Activity} title="Latest News" action={<button type="button" onClick={() => navigate("/news")} className="text-xs font-semibold text-pitch-200 hover:text-pitch-100">All →</button>} />
          {dashboard.latestNews?.length ? (
            <div className="mt-4 space-y-2.5">
              {dashboard.latestNews.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm font-semibold text-white">{item.headline}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">No headlines yet.</p>
          )}
        </Panel>
      </div>

      {/* Tournament progress */}
      <Panel className="p-5">
        <SectionHeader icon={Trophy} title="Tournament Progress" subtitle={dashboard.tournamentProgress} />
        <div className="mt-6 overflow-x-auto pb-2">
          <TournamentProgress currentStage={dashboard.tournamentStage} className="min-w-[640px]" />
        </div>
      </Panel>
    </div>
  );
}

/* ---------- helpers ---------- */

function computeUnits(startingXI, fallback) {
  const buckets = { attack: [], midfield: [], defense: [] };
  startingXI.forEach((entry) => {
    const ovr = entry.player?.overall;
    if (ovr == null) return;
    if (ATT_POS.has(entry.position)) buckets.attack.push(ovr);
    else if (MID_POS.has(entry.position)) buckets.midfield.push(ovr);
    else if (DEF_POS.has(entry.position)) buckets.defense.push(ovr);
  });
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : fallback);
  return { attack: avg(buckets.attack), midfield: avg(buckets.midfield), defense: avg(buckets.defense) };
}

function moraleStatus(value = 0) {
  if (value >= 84) return { label: "Excellent", tone: "green" };
  if (value >= 76) return { label: "High", tone: "green" };
  if (value >= 66) return { label: "Good", tone: "blue" };
  if (value >= 56) return { label: "Medium", tone: "amber" };
  return { label: "Low", tone: "red" };
}

function outcomeForTeam(result, teamCode) {
  if (result.knockout?.winnerTeam) return result.knockout.winnerTeam.code === teamCode ? "W" : "L";
  if (result.score.home === result.score.away) return "D";
  const homeWin = result.score.home > result.score.away;
  const isHome = result.teams.home.code === teamCode;
  return (homeWin && isHome) || (!homeWin && !isHome) ? "W" : "L";
}

function computeForm(recentResults = [], teamCode) {
  // recentResults arrive newest-first; reverse to oldest-first for left-to-right reading.
  return [...recentResults].reverse().map((result) => outcomeForTeam(result, teamCode));
}

function computeConfidence(myOverall = 75, oppOverall, morale = 75, form = 75) {
  if (oppOverall == null) return Math.round(Math.max(30, Math.min(90, (morale + form) / 2)));
  return Math.round(Math.max(20, Math.min(94, 50 + (myOverall - oppOverall) * 4 + (morale - 75) * 0.3)));
}

function getNextOpponentName(nextMatch, selectedTeamCode) {
  if (!nextMatch || !selectedTeamCode) return null;
  return nextMatch.homeTeamCode === selectedTeamCode || nextMatch.homeTeam === selectedTeamCode ? nextMatch.awayTeam : nextMatch.homeTeam;
}

function formatStageForCard(stage) {
  if (!stage) return "TBD";
  return stage.replace("Group Stage - Matchday", "Group MD");
}

function formatLocation(fixture) {
  return [fixture?.city, fixture?.country].filter(Boolean).join(", ") || "Host city TBD";
}

function formatWeather(weather) {
  if (!weather) return "Weather TBD";
  if (weather.label) return weather.label;
  if (weather.condition && weather.temperatureC != null) return `${weather.condition} ${weather.temperatureC}\u00b0C`;
  return weather.condition || "Weather TBD";
}

function getManagerCareer(career = {}) {
  return {
    wins: career.wins || 0,
    draws: career.draws || 0,
    losses: career.losses || 0,
    goalsFor: career.goalsFor || 0,
    goalsAgainst: career.goalsAgainst || 0,
    winRate: career.winRate || 0,
    bestTournamentFinish: career.bestTournamentFinish || "Not started",
    trophiesWon: career.trophiesWon || 0,
    reputation: career.reputation || 0,
    reputationTitle: career.reputationTitle || "Unknown Coach",
  };
}

/* ---------- small presentational components ---------- */

function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pitch-400/12 text-pitch-200 ring-1 ring-pitch-300/20">
          <Icon size={18} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function UnitBar({ label, value, tone }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="flex-1">
        <ProgressBar value={value} tone={tone} showValue={false} label="" />
      </div>
      <span className="w-7 text-right text-xs font-bold text-white">{value}</span>
    </div>
  );
}

function Advice({ label, icon: Icon, children }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {Icon ? <Icon size={14} /> : null} {label}
      </p>
      <p className="mt-2 rounded-xl border border-pitch-300/15 bg-pitch-400/[0.06] p-3 text-sm leading-6 text-pitch-50">{children}</p>
    </div>
  );
}

function MatchSide({ name, flag }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Flag src={flag} alt={`${name} flag`} size="xl" />
      <span className="text-sm font-semibold text-white">{name}</span>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-xs font-medium text-white">{value}</p>
    </div>
  );
}

function PosBadge({ position }) {
  return <span className="rounded-md bg-pitch-400/10 px-2 py-0.5 text-xs font-semibold text-pitch-100">{position}</span>;
}

function MiniBar({ value = 0, tone = "green" }) {
  const color = tone === "amber" ? "from-amber-300 to-amber-500" : "from-pitch-400 to-pitch-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="text-xs text-slate-400">{value}</span>
    </div>
  );
}

function MediaCard({ label, value, trend, tone, invert }) {
  const up = trend === "up";
  const flat = !trend || trend === "flat";
  const good = invert ? !up : up;
  const Arrow = flat ? ArrowRight : up ? ArrowUpRight : ArrowDownRight;
  const arrowClass = flat ? "text-slate-500" : good ? "text-pitch-300" : "text-red-300";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <Arrow size={16} className={arrowClass} />
      </div>
      <p className="mt-1 text-3xl font-black text-white">{value ?? "—"}%</p>
      <div className="mt-2">
        <ProgressBar value={value} tone={tone} showValue={false} label="" />
      </div>
    </div>
  );
}

function AvailabilityList({ title, tone, icon: Icon, items = [], onOpen }) {
  const toneClass = tone === "red" ? "text-red-200" : "text-amber-200";
  const list = items || [];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneClass}`}>
        <Icon size={14} /> {title} ({list.length})
      </p>
      {list.length ? (
        <div className="mt-3 space-y-2">
          {list.map((item) => (
            <button
              key={item.index}
              type="button"
              onClick={() => onOpen(item.index)}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-left text-sm transition hover:bg-white/[0.07]"
            >
              <span className="min-w-0 truncate font-medium text-white">{item.name}</span>
              <span className="shrink-0 text-xs text-slate-400">{item.position} · {item.matchesOut}m</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">None — full squad fit.</p>
      )}
    </div>
  );
}

function RecordItem({ label, value }) {
  return (
    <div className="rounded-lg bg-white/[0.04] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function TeamNameWithFlag({ team }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Flag src={team?.flag} alt={`${team?.name || "Team"} flag`} size="sm" />
      <span className="truncate">{team?.name || "TBD"}</span>
    </span>
  );
}
