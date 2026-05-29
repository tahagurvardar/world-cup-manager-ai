import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Shield } from "lucide-react";
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
        title="Select National Team"
        description="Choose one country for the tournament save. This resets squad context, tactics, results, and news for the current manager profile."
        action={
          <button
            type="button"
            disabled={!selected || saving}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 rounded-md bg-pitch-400 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-pitch-300 disabled:opacity-50"
          >
            <CheckCircle2 size={18} />
            {saving ? "Selecting..." : "Confirm Team"}
          </button>
        }
      />

      {error ? <p className="mb-4 rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

      <div className="space-y-6">
        {Object.entries(groupedTeams).map(([group, groupTeams]) => (
          <section key={group}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-pitch-200">Group {group}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {groupTeams.map((team) => {
                const isSelected = selected === team.code;
                return (
                  <button
                    type="button"
                    key={team.code}
                    onClick={() => setSelected(team.code)}
                    className={`rounded-lg border p-4 text-left transition ${
                      isSelected
                        ? "border-pitch-300 bg-pitch-400/12"
                        : "border-white/10 bg-white/[0.045] hover:border-pitch-300/45"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-md bg-white/10 text-pitch-200">
                        <Shield size={20} />
                      </span>
                      <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300">OVR {team.overall}</span>
                    </div>
                    <p className="mt-4 text-lg font-semibold text-white">{team.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{team.region}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <span>Morale {team.morale}</span>
                      <span>Form {team.form}</span>
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
