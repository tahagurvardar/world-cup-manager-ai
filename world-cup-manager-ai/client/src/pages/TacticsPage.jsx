import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import { tacticOptions } from "../data/sampleData";
import { fetchTactics, saveTactics } from "../services/gameService";
import { getErrorMessage } from "../services/api";

const labels = {
  formation: "Formation",
  mentality: "Mentality",
  pressing: "Pressing",
  tempo: "Tempo",
  defensiveLine: "Defensive line",
};

export default function TacticsPage() {
  const [tactics, setTactics] = useState({
    formation: "4-3-3",
    mentality: "balanced",
    pressing: "medium",
    tempo: "normal",
    defensiveLine: "medium",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetchTactics()
      .then((data) => {
        if (isMounted) setTactics(data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const saved = await saveTactics(tactics);
      setTactics(saved);
      setMessage("Tactics saved for the next match.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading tactical board..." />;

  return (
    <>
      <PageHeader
        title="Tactics"
        description="Set the match model inputs that influence possession, pressing risk, chance quality, stamina cost, and defensive exposure."
        action={
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-pitch-400 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-pitch-300 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Tactics"}
          </button>
        }
      />

      {message ? <p className="mb-4 rounded-md border border-pitch-300/20 bg-pitch-400/10 px-3 py-2 text-sm text-pitch-100">{message}</p> : null}
      {error ? <p className="mb-4 rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel className="p-5">
          <div className="grid gap-5">
            {Object.entries(tacticOptions).map(([field, options]) => (
              <div key={field}>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">{labels[field]}</p>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {options.map((option) => {
                    const active = tactics[field] === option;
                    return (
                      <button
                        type="button"
                        key={option}
                        onClick={() => setTactics((current) => ({ ...current, [field]: option }))}
                        className={`rounded-md border px-3 py-3 text-sm font-semibold capitalize transition ${
                          active
                            ? "border-pitch-300 bg-pitch-400 text-ink-950"
                            : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-pitch-300/50"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Match Model Impact</h2>
          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <ImpactRow label="Shape" value={`${tactics.formation} base structure`} />
            <ImpactRow label="Risk" value={tactics.mentality === "attacking" ? "Higher xG and transition exposure" : tactics.mentality === "defensive" ? "Lower xG, stronger block" : "Balanced phases"} />
            <ImpactRow label="Pressing cost" value={tactics.pressing === "high" ? "Higher fouls and stamina drain" : tactics.pressing === "low" ? "Lower fouls, less territory" : "Moderate pressure"} />
            <ImpactRow label="Tempo" value={tactics.tempo === "fast" ? "More variance and direct attacks" : tactics.tempo === "slow" ? "More control, fewer transitions" : "Stable rhythm"} />
            <ImpactRow label="Line height" value={tactics.defensiveLine === "high" ? "More territory, more space behind" : tactics.defensiveLine === "low" ? "Compact box defense" : "Standard spacing"} />
          </div>
        </Panel>
      </div>
    </>
  );
}

function ImpactRow({ label, value }) {
  return (
    <div className="rounded-md bg-white/[0.04] p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  );
}
