export default function StatCard({ label, value, detail, icon: Icon, tone = "green" }) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-400/12 text-amber-200 ring-amber-300/20"
      : tone === "red"
        ? "bg-red-400/12 text-red-200 ring-red-300/20"
        : "bg-pitch-400/12 text-pitch-100 ring-pitch-300/20";

  return (
    <div className="rounded-lg border border-white/10 bg-ink-850/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        {Icon ? (
          <span className={`grid h-10 w-10 place-items-center rounded-md ring-1 ${toneClass}`}>
            <Icon size={20} />
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-3 text-sm text-slate-400">{detail}</p> : null}
    </div>
  );
}
