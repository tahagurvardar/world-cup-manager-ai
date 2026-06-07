import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Award,
  Ban,
  Brain,
  Dumbbell,
  Footprints,
  Gauge,
  Goal,
  Hand,
  Heart,
  HeartPulse,
  ShieldHalf,
  Sparkles,
  Star,
  Target,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Flag from "../components/Flag.jsx";
import AvailabilityBadge from "../components/AvailabilityBadge.jsx";
import LoadingState from "../components/LoadingState.jsx";
import Panel from "../components/Panel.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { fetchPlayerProfile } from "../services/gameService";
import { getErrorMessage } from "../services/api";

export default function PlayerProfilePage() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  // Error is tagged with the id it belongs to so a stale error never shows for a new id.
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchPlayerProfile(playerId)
      .then((data) => {
        if (isMounted) {
          setProfile(data);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (isMounted) setError({ id: playerId, message: getErrorMessage(requestError) });
      });

    return () => {
      isMounted = false;
    };
  }, [playerId]);

  if (error && error.id === playerId) {
    return (
      <Panel className="p-8 text-center">
        <h1 className="text-2xl font-bold text-white">Player unavailable</h1>
        <p className="mt-2 text-sm text-slate-400">{error.message || "This player profile could not be loaded."}</p>
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost mx-auto mt-6">
          <ArrowLeft size={16} /> Go back
        </button>
      </Panel>
    );
  }

  // While the requested id differs from the loaded profile, show the loader.
  if (!profile || profile.id !== playerId) return <LoadingState label="Loading player profile..." />;

  const radarData = Object.entries(profile.attributes.radar).map(([axis, value]) => ({ axis, value }));

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        {/* Left: player card */}
        <div className="space-y-6">
          <PlayerCard profile={profile} />
          <ConditionCard profile={profile} />
        </div>

        {/* Right: attributes, stats, form */}
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <AttributesCard attributes={profile.attributes} />
            <RadarCard data={radarData} />
          </div>
          <TournamentStatsCard stats={profile.tournamentStats} position={profile.position} />
          <CareerStatsCard stats={profile.careerStats} />
          <FormChartCard history={profile.ratingHistory} />
        </div>
      </div>
    </div>
  );
}

/* ---------- left column ---------- */

function PlayerCard({ profile }) {
  return (
    <Panel className="animate-fade-in-up overflow-hidden p-0">
      <div className="relative bg-gradient-to-b from-pitch-500/25 to-transparent p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pitch-400/15 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-start justify-between">
          <OverallBadge value={profile.overall} />
          <div className="flex flex-col items-end gap-2">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-ink-950/70 text-xl font-black text-white">
              {profile.shirtNumber}
            </span>
            <PositionBadge position={profile.position} />
            {profile.isCaptain ? <CaptainTag label="Captain" /> : profile.isViceCaptain ? <CaptainTag label="Vice-Captain" /> : null}
          </div>
        </div>

        <h1 className="relative mt-5 text-2xl font-black leading-tight text-white">{profile.name}</h1>
        <div className="relative mt-2 flex items-center gap-2 text-sm text-slate-300">
          <Flag src={profile.team.flag} alt={`${profile.team.name} flag`} size="sm" />
          <span className="font-semibold">{profile.team.name}</span>
          <span className="text-slate-500">·</span>
          <span>{profile.nationality}</span>
        </div>
        <div className="relative mt-3">
          <AvailabilityBadge availability={profile.availability} showAvailable />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/[0.06]">
        <InfoTile label="Age" value={profile.age} />
        <InfoTile label="Position" value={profile.position} />
        <InfoTile label="Preferred Foot" value={profile.preferredFoot} icon={Footprints} />
        <InfoTile label="Club" value={profile.club} />
      </div>
    </Panel>
  );
}

function ConditionCard({ profile }) {
  return (
    <Panel className="animate-fade-in-up animate-delay-1 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
        <Heart size={15} className="text-pitch-200" /> Condition
      </h2>
      <div className="mt-4 space-y-4">
        <ProgressBar label="Form" value={profile.form} tone={toneFor(profile.form)} />
        <ProgressBar label="Morale" value={profile.morale} tone={toneFor(profile.morale)} />
        <ProgressBar label="Fitness" value={profile.fitness} tone={toneFor(profile.fitness)} />
      </div>
      {profile.availability && profile.availability.status !== "available" ? (
        <div className={`mt-4 rounded-xl border p-3 text-sm ${profile.availability.status === "injured" ? "border-red-400/25 bg-red-500/[0.08] text-red-100" : "border-amber-300/25 bg-amber-400/[0.08] text-amber-100"}`}>
          <p className="flex items-center gap-2 font-semibold">
            {profile.availability.status === "injured" ? <HeartPulse size={15} /> : <Ban size={15} />}
            {profile.availability.status === "injured" ? "Currently injured" : "Currently suspended"}
          </p>
          <p className="mt-1 text-xs opacity-90">
            {profile.availability.label}
            {profile.availability.severity ? ` (${profile.availability.severity})` : ""} · {profile.availability.matchesOut} match{profile.availability.matchesOut > 1 ? "es" : ""} remaining
          </p>
        </div>
      ) : null}
    </Panel>
  );
}

/* ---------- right column ---------- */

function AttributesCard({ attributes }) {
  return (
    <Panel className="animate-fade-in-up p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <Gauge size={18} className="text-pitch-200" /> Attributes
      </h2>
      <div className="mt-5 grid gap-6 sm:grid-cols-3">
        <AttributeGroup title="Technical" icon={Target} rows={[
          ["Passing", attributes.technical.passing],
          ["Shooting", attributes.technical.shooting],
          ["Dribbling", attributes.technical.dribbling],
        ]} />
        <AttributeGroup title="Physical" icon={Dumbbell} rows={[
          ["Pace", attributes.physical.pace],
          ["Strength", attributes.physical.strength],
          ["Stamina", attributes.physical.stamina],
        ]} />
        <AttributeGroup title="Mental" icon={Brain} rows={[
          ["Composure", attributes.mental.composure],
          ["Leadership", attributes.mental.leadership],
          ["Vision", attributes.mental.vision],
        ]} />
      </div>
    </Panel>
  );
}

function AttributeGroup({ title, icon: Icon, rows }) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-pitch-200">
        <Icon size={14} /> {title}
      </p>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-300">{label}</span>
              <span className={`font-bold ${attrTextTone(value)}`}>{value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div className={`h-full rounded-full bg-gradient-to-r ${attrBarTone(value)} transition-[width] duration-700`} style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadarCard({ data }) {
  return (
    <Panel className="animate-fade-in-up animate-delay-1 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <Sparkles size={18} className="text-pitch-200" /> Profile
      </h2>
      <div className="mt-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="rgba(255,255,255,0.14)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#cbd5e1", fontSize: 11, fontWeight: 600 }} />
            <Radar dataKey="value" stroke="#4ade80" fill="#22c55e" fillOpacity={0.32} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function TournamentStatsCard({ stats, position }) {
  const tiles = [
    { label: "Matches", value: stats.matches, icon: Activity },
    { label: "Goals", value: stats.goals, icon: Goal },
    { label: "Assists", value: stats.assists, icon: Target },
    { label: "Avg Rating", value: stats.averageRating ? stats.averageRating.toFixed(2) : "—", icon: Star, highlight: true },
    { label: "Clean Sheets", value: stats.cleanSheets, icon: Hand, hide: position !== "GK" && !stats.cleanSheets },
    { label: "Yellow Cards", value: stats.yellowCards, icon: ShieldHalf },
    { label: "Red Cards", value: stats.redCards, icon: ShieldHalf },
  ].filter((tile) => !tile.hide);

  return (
    <Panel className="animate-fade-in-up animate-delay-2 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <Award size={18} className="text-pitch-200" /> Tournament Statistics
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </div>
      {!stats.matches ? (
        <p className="mt-4 rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-slate-400">
          No tournament appearances yet. Stats will populate once this player features in a simulated match.
        </p>
      ) : null}
    </Panel>
  );
}

function CareerStatsCard({ stats }) {
  return (
    <Panel className="animate-fade-in-up animate-delay-3 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <Zap size={18} className="text-pitch-200" /> Career Statistics
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="International Caps" value={stats.internationalCaps} icon={ShieldHalf} />
        <StatTile label="International Goals" value={stats.internationalGoals} icon={Goal} />
        <StatTile label="Tournament Appearances" value={stats.tournamentAppearances} icon={Award} />
      </div>
    </Panel>
  );
}

function FormChartCard({ history }) {
  return (
    <Panel className="animate-fade-in-up animate-delay-4 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <Activity size={18} className="text-pitch-200" /> Form &amp; Rating Trend
      </h2>
      {history.length ? (
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[4, 10]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: "#0a1712", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 }}
                labelStyle={{ color: "#86efac" }}
                formatter={(value) => [value, "Rating"]}
              />
              <Area type="monotone" dataKey="rating" stroke="#4ade80" strokeWidth={2} fill="url(#ratingFill)" dot={{ r: 3, fill: "#4ade80" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">
          No match ratings recorded yet. Play matches to build this player's form trend.
        </p>
      )}
    </Panel>
  );
}

/* ---------- small pieces ---------- */

function OverallBadge({ value }) {
  return (
    <div className="relative grid h-24 w-24 place-items-center">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pitch-300 to-pitch-600 shadow-glow" />
      <div className="absolute inset-[3px] rounded-xl bg-ink-950/85" />
      <div className="relative text-center">
        <p className="text-4xl font-black leading-none text-white">{value}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-pitch-200">Overall</p>
      </div>
    </div>
  );
}

function PositionBadge({ position }) {
  return (
    <span className="rounded-lg bg-pitch-400/15 px-3 py-1 text-sm font-bold text-pitch-100 ring-1 ring-pitch-300/25">{position}</span>
  );
}

function CaptainTag({ label }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-ink-950 shadow">
      <Star size={11} /> {label}
    </span>
  );
}

function InfoTile({ label, value, icon: Icon }) {
  return (
    <div className="bg-ink-950/40 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 truncate font-semibold text-white">
        {Icon ? <Icon size={14} className="text-pitch-200" /> : null}
        {value}
      </p>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, highlight }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-pitch-300/25 bg-pitch-400/[0.08]" : "border-white/10 bg-white/[0.03]"}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {Icon ? <Icon size={13} /> : null} {label}
      </p>
      <p className={`mt-1.5 text-2xl font-bold ${highlight ? "text-pitch-100" : "text-white"}`}>{value}</p>
    </div>
  );
}

/* ---------- tone helpers ---------- */

function toneFor(value) {
  if (value >= 80) return "green";
  if (value >= 65) return "blue";
  if (value >= 50) return "amber";
  return "red";
}

function attrBarTone(value) {
  if (value >= 85) return "from-pitch-300 to-pitch-500";
  if (value >= 75) return "from-pitch-400 to-pitch-600";
  if (value >= 65) return "from-sky-400 to-sky-600";
  return "from-amber-300 to-amber-500";
}

function attrTextTone(value) {
  if (value >= 85) return "text-pitch-200";
  if (value >= 75) return "text-pitch-100";
  if (value >= 65) return "text-sky-200";
  return "text-amber-200";
}
