import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Shield } from "lucide-react";
import Flag from "../components/Flag.jsx";
import PageHeader from "../components/PageHeader.jsx";
import LoadingState from "../components/LoadingState.jsx";
import { sampleTeams } from "../data/sampleData";
import { fetchTeams, selectTeam } from "../services/gameService";
import { getErrorMessage } from "../services/api";

export default function SelectTeamPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetchTeams()
      .then((data) => {
        if (isMounted) setTeams(data);
      })
      .catch(() => {
        if (isMounted) setTeams(sampleTeams);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const groupedTeams = useMemo(() => {
    return teams.reduce((collection, team) => {
      const group = collection[team.group] || [];
      return { ...collection, [team.group]: [...group, team] };
    }, {});
  }, [teams]);

  async function handleConfirm() {
    if (!selected) return;
    setSaving(true);
    setError("");

    try {
      await selectTeam(selected);
      navigate("/dashboard");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading national teams..." />;

  return (
    <>
      <PageHeader
        icon={Shield}
        title="Select National Team"
        description="Choose one country for the tournament save. This resets squad context, tactics, results, and news for the current manager profile."
        action={
          <button type="button" disabled={!selected || saving} onClick={handleConfirm} className="btn-primary">
            <CheckCircle2 size={18} />
            {saving ? "Selecting..." : "Confirm Team"}
          </button>
        }
      />

      {error ? <p className="mb-4 rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

      <div className="space-y-6">
        {Object.entries(groupedTeams).map(([group, groupTeams]) => (
          <section key={group}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-pitch-200">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-pitch-400/15 text-xs">{group}</span>
              Group {group}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {groupTeams.map((team) => {
                const isSelected = selected === team.code;
                return (
                  <button
                    type="button"
                    key={team.code}
                    onClick={() => setSelected(team.code)}
                    className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-300 hover:-translate-y-0.5 ${
                      isSelected
                        ? "border-pitch-300 bg-pitch-400/12 shadow-glow"
                        : "border-white/10 bg-white/[0.045] hover:border-pitch-300/45 hover:shadow-glow"
                    }`}
                  >
                    {isSelected ? (
                      <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-pitch-400 text-ink-950 shadow">
                        <CheckCircle2 size={15} />
                      </span>
                    ) : null}
                    <div className="flex items-start justify-between">
                      <Flag src={team.flag} alt={`${team.name} flag`} size="xl" />
                      {!isSelected ? <span className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-slate-300">OVR {team.overall}</span> : null}
                    </div>
                    <p className="mt-4 text-lg font-semibold text-white">{team.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{team.confederation || team.region}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <Metric label="OVR" value={team.overall} />
                      <Metric label="Morale" value={team.morale} />
                      <Metric label="Form" value={team.form} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-white/[0.05] py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-bold text-white">{value}</p>
    </div>
  );
}
