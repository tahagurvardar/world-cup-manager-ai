import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Medal, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import Flag from "../components/Flag.jsx";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import { fetchDashboard, fetchTournament } from "../services/gameService";
import { routeIdFromSimId } from "../utils/player";

const awardItems = [
  { key: "goldenBoot", title: "Golden Boot" },
  { key: "goldenGlove", title: "Golden Glove" },
  { key: "bestPlayer", title: "Best Player" },
  { key: "bestYoungPlayer", title: "Best Young Player" },
  { key: "mostAssists", title: "Most Assists" },
];

const knockoutRounds = ["roundOf32", "roundOf16", "quarterFinal", "semiFinal", "thirdPlace", "final"];

export default function ChampionsPage() {
  const [payload, setPayload] = useState({ tournament: null, dashboard: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchTournament(), fetchDashboard()])
      .then(([tournament, dashboard]) => {
        if (isMounted) setPayload({ tournament, dashboard });
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.message || "Unable to load champion celebration.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const finalSummary = useMemo(() => getFinalSummary(payload.tournament), [payload.tournament]);
  const awards = useMemo(() => payload.tournament?.awards?.individual || {}, [payload.tournament]);
  const championStats = useMemo(
    () => getTeamTournamentStats(payload.tournament, finalSummary.championCode),
    [payload.tournament, finalSummary.championCode],
  );
  const story = useMemo(() => buildTournamentStory(finalSummary, awards), [finalSummary, awards]);
  const career = getCareer(payload.dashboard?.managerCareer);
  const achievements = payload.dashboard?.achievements || payload.tournament?.achievements || [];
  const latestAchievement = payload.dashboard?.latestAchievement || achievements[achievements.length - 1] || null;

  if (loading) return <LoadingState label="Preparing trophy celebration..." />;

  if (error) {
    return (
      <Panel className="p-6">
        <p className="rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      </Panel>
    );
  }

  if (!finalSummary.completed) {
    return (
      <>
        <PageHeader icon={Trophy} title="Champions" description="The trophy celebration unlocks when the World Cup is complete." />
        <Panel className="p-6 text-center">
          <Trophy className="mx-auto text-pitch-200" size={38} />
          <h1 className="mt-4 text-2xl font-bold text-white">Tournament still in progress</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
            Finish the final and third-place match to unlock the full trophy celebration.
          </p>
          <Link to="/match-center" className="btn-primary mt-6">
            Return to Match Center
          </Link>
        </Panel>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Trophy}
        title="Champions"
        description="The final whistle has gone. The trophy, awards, and campaign legacy are confirmed."
      />

      <section className="champion-fade-in relative overflow-hidden rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-300/16 via-white/[0.055] to-ink-950 p-6 shadow-[0_0_48px_rgba(245,158,11,0.13)]">
        <Confetti />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-100">World Cup Champions</p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Flag src={finalSummary.championFlag} alt={`${finalSummary.champion} flag`} size="xl" />
              <h1 className="text-5xl font-black uppercase tracking-normal text-white md:text-6xl">{finalSummary.champion}</h1>
            </div>
            <p className="mt-4 text-2xl font-bold text-amber-100">{formatFinalLine(finalSummary)}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{story[0]}</p>
          </div>

          <TrophyCard finalSummary={finalSummary} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Panel className="p-5">
          <SectionTitle icon={Sparkles} title="Tournament Story" />
          <div className="mt-4 space-y-3">
            {story.map((line) => (
              <p key={line} className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-slate-200">
                {line}
              </p>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle icon={BarChart3} title="Celebration Statistics" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Matches Played" value={championStats.matchesPlayed} />
            <Stat label="Wins" value={championStats.wins} />
            <Stat label="Draws" value={championStats.draws} />
            <Stat label="Losses" value={championStats.losses} />
            <Stat label="Goals For" value={championStats.goalsFor} />
            <Stat label="Goals Against" value={championStats.goalsAgainst} />
          </div>
        </Panel>
      </div>

      <Panel className="p-5">
        <SectionTitle icon={Medal} title="Tournament Awards" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {awardItems.map((item) => (
            <AwardCard key={item.key} title={item.title} award={awards[item.key]} />
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionTitle icon={ShieldCheck} title="Manager Legacy" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Stat label="Current Reputation" value={`${career.reputation}/100`} detail={career.reputationTitle} />
          <Stat label="Trophies Won" value={career.trophiesWon} detail="World Cups lifted" />
          <Stat label="Latest Achievement" value={latestAchievement?.title || "No achievement unlocked"} detail={latestAchievement?.description || "Complete more campaigns to build your legacy."} />
        </div>
      </Panel>
    </div>
  );
}

function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 26 }, (_, index) => (
        <span
          key={index}
          className="champion-confetti"
          style={{
            left: `${(index * 37) % 100}%`,
            animationDelay: `${(index % 9) * 0.16}s`,
            animationDuration: `${2.8 + (index % 5) * 0.28}s`,
          }}
        />
      ))}
    </div>
  );
}

function TrophyCard({ finalSummary }) {
  return (
    <div className="relative rounded-2xl border border-amber-200/30 bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-700 p-1 shadow-[0_0_60px_rgba(251,191,36,0.24)]">
      <div className="rounded-[0.85rem] bg-ink-950/90 p-6 text-center">
        <span className="champion-trophy-pulse mx-auto grid h-28 w-28 place-items-center rounded-full border border-amber-200/30 bg-amber-300/15 text-amber-100 shadow-[0_0_42px_rgba(251,191,36,0.35)]">
          <Trophy size={58} strokeWidth={1.7} />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-amber-100">Final Score</p>
        <p className="mt-2 text-2xl font-black text-white">{formatFinalLine(finalSummary)}</p>
        <p className="mt-2 text-sm text-slate-400">Runner-up: {finalSummary.runnerUp}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-pitch-400/12 text-pitch-200">
        <Icon size={20} />
      </span>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
  );
}

function AwardCard({ title, award }) {
  const routeId = award?.playerId ? routeIdFromSimId(award.playerId) : null;
  const name = award?.name || "TBD";

  return (
    <article className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {routeId ? (
        <Link to={`/player/${routeId}`} className="mt-3 inline-block text-lg font-semibold text-white transition hover:text-pitch-100 hover:underline">
          {name}
        </Link>
      ) : (
        <p className="mt-3 text-lg font-semibold text-white">{name}</p>
      )}
      <p className="mt-1 text-sm text-slate-400">{award?.teamName || "Country TBD"}</p>
      <p className="mt-3 inline-flex rounded-md border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-100">
        {award?.value || "Value TBD"}
      </p>
    </article>
  );
}

function Stat({ label, value, detail }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value ?? "TBD"}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p> : null}
    </div>
  );
}

function getCareer(career = {}) {
  return {
    reputation: career.reputation || 0,
    reputationTitle: career.reputationTitle || "Unknown Coach",
    trophiesWon: career.trophiesWon || 0,
  };
}

function getFinalSummary(tournament) {
  const finalMatch = tournament?.knockout?.final?.[0];
  const thirdPlaceMatch = tournament?.knockout?.thirdPlace?.[0];
  const podium = tournament?.awards?.podium || {};

  return {
    completed: Boolean(tournament?.tournamentComplete && finalMatch?.status === "played" && thirdPlaceMatch?.status === "played"),
    champion: podium.champion || getWinnerName(finalMatch),
    championCode: getWinnerCode(finalMatch),
    championFlag: getWinnerFlag(finalMatch),
    runnerUp: podium.runnerUp || getLoserName(finalMatch),
    runnerUpCode: getLoserCode(finalMatch),
    runnerUpFlag: getLoserFlag(finalMatch),
    finalScore: getWinnerFirstScore(finalMatch),
    finalResolution: getSentenceResolution(finalMatch),
  };
}

function getTeamTournamentStats(tournament, teamCode) {
  const stats = {
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };

  if (!teamCode) return stats;

  const groupRow = (tournament?.groupStage?.table || [])
    .flatMap((group) => group.rows || [])
    .find((row) => row.teamCode === teamCode);

  if (groupRow) {
    stats.matchesPlayed += groupRow.played || 0;
    stats.wins += groupRow.wins || 0;
    stats.draws += groupRow.draws || 0;
    stats.losses += groupRow.losses || 0;
    stats.goalsFor += groupRow.goalsFor || 0;
    stats.goalsAgainst += groupRow.goalsAgainst || 0;
  }

  knockoutRounds
    .flatMap((round) => tournament?.knockout?.[round] || [])
    .filter((match) => match.status === "played" && (match.homeTeamCode === teamCode || match.awayTeamCode === teamCode))
    .forEach((match) => {
      const isHome = match.homeTeamCode === teamCode;
      const goalsFor = isHome ? match.score?.home : match.score?.away;
      const goalsAgainst = isHome ? match.score?.away : match.score?.home;
      if (goalsFor == null || goalsAgainst == null) return;

      stats.matchesPlayed += 1;
      stats.goalsFor += goalsFor;
      stats.goalsAgainst += goalsAgainst;
      if (match.winnerTeamCode) {
        if (match.winnerTeamCode === teamCode) stats.wins += 1;
        else stats.losses += 1;
      } else if (goalsFor > goalsAgainst) stats.wins += 1;
      else if (goalsFor < goalsAgainst) stats.losses += 1;
      else stats.draws += 1;
    });

  return stats;
}

function buildTournamentStory(finalSummary, awards) {
  const score = finalSummary.finalScore ? ` ${finalSummary.finalScore}` : "";
  const resolution = finalSummary.finalResolution || "";
  const lines = [
    `${finalSummary.champion} completed a remarkable campaign and lifted the World Cup after defeating ${finalSummary.runnerUp}${score} in the Final${resolution}.`,
  ];

  if (awards.bestPlayer?.name) {
    lines.push(`${awards.bestPlayer.name} finished as tournament MVP after a series of outstanding performances for ${awards.bestPlayer.teamName}.`);
  }

  if (awards.goldenBoot?.name) {
    lines.push(`${awards.goldenBoot.name} claimed the Golden Boot with ${awards.goldenBoot.value}.`);
  }

  return lines;
}

function formatFinalLine(finalSummary) {
  const score = finalSummary.finalScore || "score TBD";
  return `${finalSummary.champion} ${score} ${finalSummary.runnerUp}`;
}

function getWinnerFirstScore(match) {
  if (!match?.score || !getWinnerCode(match)) return null;
  const winnerIsHome = getWinnerCode(match) === match.homeTeamCode;
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

function getWinnerCode(match) {
  return match?.winnerTeamCode || match?.knockout?.winnerTeam?.code || null;
}

function getLoserCode(match) {
  return match?.loserTeamCode || match?.knockout?.loserTeam?.code || null;
}

function getWinnerFlag(match) {
  if (!match) return null;
  if (match.knockout?.winnerTeam?.flag) return match.knockout.winnerTeam.flag;
  if (match.winnerTeamCode === match.homeTeamCode) return match.homeFlag;
  if (match.winnerTeamCode === match.awayTeamCode) return match.awayFlag;
  return null;
}

function getLoserFlag(match) {
  if (!match) return null;
  if (match.knockout?.loserTeam?.flag) return match.knockout.loserTeam.flag;
  if (match.loserTeamCode === match.homeTeamCode) return match.homeFlag;
  if (match.loserTeamCode === match.awayTeamCode) return match.awayFlag;
  return null;
}
