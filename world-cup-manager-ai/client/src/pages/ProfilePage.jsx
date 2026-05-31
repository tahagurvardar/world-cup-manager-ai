import { useEffect, useState } from "react";
import { BarChart3, CircleUserRound, Shield, Trophy } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import { useAuth } from "../hooks/useAuth";
import { fallbackDashboard } from "../data/sampleData";
import { fetchDashboard } from "../services/gameService";

export default function ProfilePage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const career = getManagerCareer(dashboard?.managerCareer);
  const history = dashboard?.tournamentHistory || [];

  useEffect(() => {
    let isMounted = true;
    fetchDashboard()
      .then((data) => {
        if (isMounted) setDashboard(data);
      })
      .catch(() => {
        if (isMounted) setDashboard(fallbackDashboard);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <PageHeader title="Profile" description="Manager account and current national team save context." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-lg bg-white/10 text-pitch-200">
              <CircleUserRound size={28} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">{user?.username || "Manager"}</h2>
              <p className="text-sm text-slate-400">{user?.email || "No email loaded"}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 text-sm">
            <Info label="Authentication" value="JWT protected routes" />
            <Info label="Save scope" value="Single-player national tournament" />
            <Info label="Created" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Current session"} />
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-lg bg-pitch-400/12 text-pitch-200">
              <Shield size={28} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">{dashboard?.selectedTeam?.name || "No team selected"}</h2>
              <p className="text-sm text-slate-400">Current national team</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 text-sm">
            <Info label="Group" value={dashboard?.selectedTeam?.group || "TBD"} />
            <Info label="Overall" value={dashboard?.selectedTeam?.overall || "TBD"} />
            <Info label="Tournament progress" value={dashboard?.tournamentProgress || dashboard?.managerCareer?.currentTournamentFinish || "TBD"} />
            <Info label="Target" value="Lift the trophy" icon={Trophy} />
          </div>
        </Panel>

        <Panel className="p-5 lg:col-span-2">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-lg bg-pitch-400/12 text-pitch-200">
              <BarChart3 size={28} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">Manager Record</h2>
              <p className="text-sm text-slate-400">Career performance across completed and active tournaments.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <Info label="Record" value={`${career.wins}W - ${career.draws}D - ${career.losses}L`} />
            <Info label="Games Managed" value={career.gamesManaged} />
            <Info label="Goals" value={`${career.goalsFor}-${career.goalsAgainst}`} />
            <Info label="Win Rate" value={`${career.winRate}%`} />
            <Info label="Current Team" value={dashboard?.selectedTeam?.name || "No team selected"} />
            <Info label="Current Status" value={career.currentTournamentFinish} />
            <Info label="Best Finish" value={career.bestTournamentFinish} />
            <Info label="Trophies Won" value={career.trophiesWon} icon={Trophy} />
          </div>
        </Panel>
      </div>

      <Panel className="mt-6 p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-pitch-400/12 text-pitch-200">
            <Trophy size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Tournament History</h2>
            <p className="text-sm text-slate-400">Completed tournament records for this manager account.</p>
          </div>
        </div>

        {history.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {[...history].reverse().map((record) => (
              <HistoryCard key={record.id || `${record.edition}-${record.dateCompleted}`} record={record} />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
            No completed tournaments yet. Finish a World Cup to add the first career record.
          </p>
        )}
      </Panel>
    </>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-white/[0.04] p-3">
      <span className="text-slate-400">{label}</span>
      <span className="flex items-center gap-2 font-medium text-white">
        {Icon ? <Icon size={16} className="text-pitch-200" /> : null}
        {value}
      </span>
    </div>
  );
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
    currentTournamentFinish: career.currentTournamentFinish || "Not started",
    tournamentsPlayed: career.tournamentsPlayed || 0,
    trophiesWon: career.trophiesWon || 0,
  };
}

function HistoryCard({ record }) {
  return (
    <article className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{record.edition || record.year || 2026} Edition</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{record.champion || "Champion TBD"}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Final: {record.champion || "TBD"} vs {record.runnerUp || "TBD"}
          </p>
        </div>
        <span className="rounded-md border border-pitch-300/20 bg-pitch-400/10 px-3 py-2 text-sm font-semibold text-pitch-100">
          {record.selectedTeamFinish || "Finish TBD"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <HistoryInfo label="Selected Team" value={record.selectedTeam || "TBD"} />
        <HistoryInfo label="Third Place" value={record.thirdPlace || "TBD"} />
        <HistoryInfo label="Top Scorer" value={formatHistoryAward(record.topScorer)} />
        <HistoryInfo label="Best Player" value={formatHistoryAward(record.bestPlayer)} />
        <HistoryInfo label="Golden Glove" value={formatHistoryAward(record.goldenGlove)} />
        <HistoryInfo label="Completed" value={record.dateCompleted ? new Date(record.dateCompleted).toLocaleDateString() : "TBD"} />
      </div>
    </article>
  );
}

function HistoryInfo({ label, value }) {
  return (
    <div className="rounded-md bg-white/[0.04] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-white">{value}</p>
    </div>
  );
}

function formatHistoryAward(award) {
  if (!award) return "TBD";
  return `${award.name} - ${award.value}`;
}
