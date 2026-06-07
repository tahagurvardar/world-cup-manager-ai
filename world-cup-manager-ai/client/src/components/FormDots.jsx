const STYLES = {
  W: "bg-pitch-500 text-ink-950",
  D: "bg-amber-400 text-ink-950",
  L: "bg-red-500 text-white",
  "-": "bg-white/10 text-slate-500",
};

// Renders a row of W/D/L result circles. `results` is an array of "W" | "D" | "L".
export default function FormDots({ results = [], size = "md" }) {
  const dimension = size === "sm" ? "h-6 w-6 text-[11px]" : "h-7 w-7 text-xs";
  const padded = results.length >= 5 ? results.slice(-5) : [...Array(5 - results.length).fill("-"), ...results];

  return (
    <div className="flex items-center gap-1.5">
      {padded.map((result, index) => (
        <span
          key={index}
          className={`grid ${dimension} place-items-center rounded-full font-bold shadow-sm ${STYLES[result] || STYLES["-"]}`}
        >
          {result === "-" ? "" : result}
        </span>
      ))}
    </div>
  );
}
