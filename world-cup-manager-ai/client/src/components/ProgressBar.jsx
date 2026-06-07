const TONES = {
  green: "from-pitch-400 to-pitch-500",
  amber: "from-amber-300 to-amber-500",
  red: "from-red-400 to-red-500",
  blue: "from-sky-400 to-sky-500",
};

// Labeled gradient progress bar with an animated fill width.
export default function ProgressBar({ label, value = 0, tone = "green", showValue = true, suffix = "" }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label ? <span className="font-medium text-slate-300">{label}</span> : <span />}
          {showValue ? <span className="font-semibold text-white">{clamped}{suffix}</span> : null}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${TONES[tone] || TONES.green} transition-[width] duration-700 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
