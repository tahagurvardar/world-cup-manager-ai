import { useEffect, useState } from "react";
import { BarChart3, CircleUserRound, Medal, Mic, Percent, Shield, Sparkles, Swords, Target, Trophy } from "lucide-react";
import Flag from "../components/Flag.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import StatCard from "../components/StatCard.jsx";
import { useAuth } from "../hooks/useAuth";
import { fallbackDashboard } from "../data/sampleData";
import { fetchDashboard } from "../services/gameService";

export default function ProfilePage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const career = getManagerCareer(dashboard?.managerCareer);
  const history = dashboard?.tournamentHistory || [];
  const achievements = dashboard?.achievements || [];
  const board = getBoardSummary(dashboard);

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
      <PageHeader icon={CircleUserRound} title="Manager Career" description="Manager account, current national team save context, and lifetime career record." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Career Record" value={`${career.wins}-${career.draws}-${career.losses}`} detail="W · D · L" icon={Swords} className="animate-fade-in-up" />
        <StatCard label="Tournaments" value={career.tournamentsPlayed} detail="Editions played" icon={Trophy} tone="blue" className="animate-fade-in-up animate-delay-1" />
        <StatCard label="Best Finish" value={career.bestTournamentFinish} icon={Medal} tone="amber" className="animate-fade-in-up animate-delay-2" />
        <StatCard label="Win Rate" value={`${career.winRate}%`} detail={`${career.gamesManaged} games managed`} icon={Percent} className="animate-fade-in-up animate-delay-3" />
        <StatCard label="Trophies" value={career.trophiesWon} detail="World Cups lifted" icon={Trophy} tone="amber" className="animate-fade-in-up animate-delay-4" />
        <StatCard label="Reputation" value={`${career.reputation}/100`} detail={career.reputationTitle} icon={Sparkles} tone="green" className="animate-fade-in-up animate-delay-4" />
      </div>

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
              {dashboard?.selectedTeam?.flag ? (
                <Flag src={dashboard.selectedTeam.flag} alt={`${dashboard.selectedTeam.name} flag`} size="lg" />
              ) : (
                <Shield size={28} />
              )}
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
            <Info label="Board Target" value={dashboard?.boardExpectation?.targetLabel || "Lift the trophy"} icon={Trophy} />
          </div>
        </Panel>

        <Panel className="p-5 lg:col-span-2">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-lg bg-pitch-400/12 text-pitch-200">
              <BarChart3 size={28} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">Current Save Detail</h2>
              <p className="text-sm text-slate-400">Active tournament context and goal record.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <Info label="Current Team" value={dashboard?.selectedTeam?.name || "No team selected"} />
            <Info label="Current Status" value={career.currentTournamentFinish} />
            <Info label="Games Managed" value={career.gamesManaged} />
            <Info label="Goals For/Against" value={`${career.goalsFor}-${career.goalsAgainst}`} />
          </div>

          <div className="mt-5 border-t border-white/10 pt-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-pitch-200">
              <Mic size={14} /> Media Relations
            </p>
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <Info label="Press Conferences Held" value={career.pressConferencesHeld} />
              <Info label="Positive Media Reactions" value={career.positiveMediaReactions} />
              <Info label="Negative Media Reactions" value={career.negativeMediaReactions} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel className="mt-6 p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-pitch-400/12 text-pitch-200">
            <Target size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Board & Career Evaluation</h2>
            <p className="text-sm text-slate-400">Current board target, job security, and how the board rated your campaigns.</p>
          </div>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Info label="Current Board Target" value={dashboard?.boardExpectation?.targetLabel || "No active target"} />
          <Info label="Board Confidence" value={board.boardConfidence != null ? `${board.boardConfidence}%` : "—"} />
          <Info label="Job Security" value={`${board.jobSecurity}% · ${board.jobSecurityStatus}`} icon={Shield} />
          <Info label="Best Evaluation" value={formatEvaluation(dashboard?.bestEvaluation)} />
        </div>

        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-pitch-200">
            <Medal size={14} /> Last Board Evaluation
          </p>
          {dashboard?.lastEvaluation ? (
            <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <Info label="Verdict" value={dashboard.lastEvaluation.status} />
              <Info label="Team" value={dashboard.lastEvaluation.teamName || "—"} />
              <Info label="Target" value={dashboard.lastEvaluation.targetLabel || "—"} />
              <Info label="Result" value={dashboard.lastEvaluation.achievedLabel || "—"} />
            </div>
          ) : (
            <p className="rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
              No completed evaluation yet. Finish a tournament to receive the board&apos;s verdict.
            </p>
          )}
        </div>
      </Panel>

      <Panel className="mt-6 p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-pitch-400/12 text-pitch-200">
            <Sparkles size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Achievements</h2>
            <p className="text-sm text-slate-400">Persistent milestones unlocked across your manager career.</p>
          </div>
        </div>

        {achievements.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...achievements].reverse().map((achievement) => (
              <AchievementCard key={achievement.id || achievement.key} achievement={achievement} />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
            No achievements unlocked yet. Finish a tournament to start building your legacy.
          </p>
        )}
      </Panel>

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
    reputation: career.reputation || 0,
    reputationTitle: career.reputationTitle || "Unknown Coach",
    pressConferencesHeld: career.pressConferencesHeld || 0,
    positiveMediaReactions: career.positiveMediaReactions || 0,
    negativeMediaReactions: career.negativeMediaReactions || 0,
  };
}

function getBoardSummary(dashboard) {
  const jobSecurity = dashboard?.jobSecurity ?? dashboard?.boardExpectation?.jobSecurity ?? 70;
  return {
    boardConfidence: dashboard?.boardExpectation?.boardConfidence ?? null,
    jobSecurity,
    jobSecurityStatus: dashboard?.jobSecurityStatus ?? dashboard?.boardExpectation?.jobSecurityStatus ?? "Stable",
  };
}

function formatEvaluation(evaluation) {
  if (!evaluation || !evaluation.status) return "No evaluation yet";
  const context = [evaluation.teamName, evaluation.year].filter(Boolean).join(", ");
  return context ? `${evaluation.status} (${context})` : evaluation.status;
}

function AchievementCard({ achievement }) {
  return (
    <article className="rounded-md border border-amber-300/20 bg-amber-400/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">{achievement.year || 2026}</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{achievement.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{achievement.description || "Career milestone unlocked."}</p>
      {achievement.player || achievement.value ? (
        <p className="mt-3 text-xs font-semibold text-amber-100">
          {[achievement.player, achievement.value].filter(Boolean).join(" - ")}
        </p>
      ) : null}
    </article>
  );
}

function HistoryCard({ record }) {
  return (
    <article className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{record.edition || record.year || 2026} Edition</p>
          <h3 className="mt-2 flex items-center gap-2 text-xl font-semibold text-white">
            <Flag src={record.championFlag} alt={`${record.champion || "Champion"} flag`} size="sm" />
            <span>{record.champion || "Champion TBD"}</span>
          </h3>
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
