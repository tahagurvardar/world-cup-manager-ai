const TONES = {
  green: "from-pitch-400/20 to-pitch-500/5 text-pitch-100 ring-pitch-300/25",
  amber: "from-amber-400/20 to-amber-500/5 text-amber-200 ring-amber-300/25",
  red: "from-red-400/20 to-red-500/5 text-red-200 ring-red-300/25",
  blue: "from-sky-400/20 to-sky-500/5 text-sky-200 ring-sky-300/25",
};

export default function StatCard({ label, value, detail, icon: Icon, tone = "green", children, className = "" }) {
  const toneClass = TONES[tone] || TONES.green;

  return (
    <div className={`glass-card glass-hover group relative overflow-hidden p-4 ${className}`}>
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-pitch-400/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-60"
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-2 truncate text-3xl font-bold text-white">{value}</p>
        </div>
        {Icon ? (
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ${toneClass}`}>
            <Icon size={20} />
          </span>
        ) : null}
      </div>
      {children ? <div className="relative mt-3">{children}</div> : null}
      {detail ? <p className="relative mt-3 text-sm text-slate-400">{detail}</p> : null}
    </div>
  );
}
