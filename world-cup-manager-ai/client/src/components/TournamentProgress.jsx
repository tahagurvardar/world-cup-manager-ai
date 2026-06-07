import { Check } from "lucide-react";

const TOURNAMENT_STAGES = ["Group Stage", "Round of 32", "Round of 16", "Quarter Final", "Semi Final", "Final"];

// Maps a free-form stage label from the API to an index in TOURNAMENT_STAGES.
function resolveStageIndex(stage) {
  if (!stage) return 0;
  const value = stage.toLowerCase();
  if (value.includes("final") && !value.includes("semi") && !value.includes("quarter") && !value.includes("third")) return 5;
  if (value.includes("semi")) return 4;
  if (value.includes("quarter")) return 3;
  if (value.includes("round of 16")) return 2;
  if (value.includes("round of 32")) return 1;
  if (value.includes("complete")) return 5;
  return 0;
}

// Horizontal stage tracker with the current stage highlighted.
export default function TournamentProgress({ currentStage, className = "" }) {
  const activeIndex = resolveStageIndex(currentStage);

  return (
    <div className={`flex items-center ${className}`}>
      {TOURNAMENT_STAGES.map((stage, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;

        return (
          <div key={stage} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <span
                className={`grid h-9 w-9 place-items-center rounded-full border text-xs font-bold transition ${
                  active
                    ? "border-pitch-300 bg-gradient-to-b from-pitch-400 to-pitch-500 text-ink-950 shadow-glow animate-pulse-glow"
                    : done
                      ? "border-pitch-400/40 bg-pitch-500/20 text-pitch-100"
                      : "border-white/10 bg-white/[0.04] text-slate-500"
                }`}
              >
                {done ? <Check size={15} /> : index + 1}
              </span>
              <span className={`whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide ${active ? "text-pitch-100" : done ? "text-slate-300" : "text-slate-500"}`}>
                {stage}
              </span>
            </div>
            {index < TOURNAMENT_STAGES.length - 1 ? (
              <div className={`mx-1 mb-6 h-0.5 flex-1 rounded-full ${index < activeIndex ? "bg-pitch-500/50" : "bg-white/10"}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
