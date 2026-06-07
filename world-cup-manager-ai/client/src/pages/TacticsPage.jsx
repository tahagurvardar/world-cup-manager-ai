import { useEffect, useState } from "react";
import { ClipboardList, Save } from "lucide-react";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import TacticalPitch from "../components/TacticalPitch.jsx";
import { tacticOptions } from "../data/sampleData";
import { autoSquad, fetchSquad, fetchTactics, saveTactics } from "../services/gameService";
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
  const [savedFormation, setSavedFormation] = useState("4-3-3");
  const [previewXI, setPreviewXI] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchTactics(), fetchSquad().catch(() => null)])
      .then(([tacticsData, squadData]) => {
        if (!isMounted) return;
        setTactics(tacticsData);
        setSavedFormation(tacticsData.formation);
        if (squadData) setPreviewXI(squadData.startingXI);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleFormationChange(formation) {
    setTactics((current) => ({ ...current, formation }));
    setMessage("");
    try {
      const data = await autoSquad(formation);
      setPreviewXI(data.startingXI);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const saved = await saveTactics(tactics);
      setTactics(saved);
      setSavedFormation(saved.formation);
      setMessage(
        savedFormation !== saved.formation
          ? `Tactics saved. A default Starting XI was applied for the ${saved.formation}.`
          : "Tactics saved for the next match.",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading tactical board..." />;

  const formationChanged = savedFormation !== tactics.formation;

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="Tactics"
        description="Set the match model inputs that influence possession, pressing risk, chance quality, stamina cost, and defensive exposure."
        action={
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
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
                        onClick={() =>
                          field === "formation"
                            ? handleFormationChange(option)
                            : setTactics((current) => ({ ...current, [field]: option }))
                        }
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

          <div className="mt-6 space-y-4 text-sm text-slate-300">
            <ImpactRow label="Shape" value={`${tactics.formation} base structure`} />
            <ImpactRow label="Risk" value={tactics.mentality === "attacking" ? "Higher xG and transition exposure" : tactics.mentality === "defensive" ? "Lower xG, stronger block" : "Balanced phases"} />
            <ImpactRow label="Pressing cost" value={tactics.pressing === "high" ? "Higher fouls and stamina drain" : tactics.pressing === "low" ? "Lower fouls, less territory" : "Moderate pressure"} />
            <ImpactRow label="Tempo" value={tactics.tempo === "fast" ? "More variance and direct attacks" : tactics.tempo === "slow" ? "More control, fewer transitions" : "Stable rhythm"} />
            <ImpactRow label="Line height" value={tactics.defensiveLine === "high" ? "More territory, more space behind" : tactics.defensiveLine === "low" ? "Compact box defense" : "Standard spacing"} />
          </div>
        </Panel>

        <Panel className="p-5">
          <TacticalPitch
            formation={tactics.formation}
            startingXI={previewXI}
            title="Formation Preview"
            subtitle={formationChanged ? "Suggested XI for the new shape" : "Current Starting XI"}
          />
          {formationChanged ? (
            <p className="mt-4 rounded-md border border-pitch-300/15 bg-pitch-400/10 p-3 text-xs leading-5 text-pitch-50">
              Save Tactics to confirm the {tactics.formation} and apply this suggested Starting XI. You can fine-tune it afterwards on the Squad page.
            </p>
          ) : null}
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
