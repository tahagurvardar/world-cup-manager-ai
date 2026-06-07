export default function LoadingState({ label = "Loading match data..." }) {
  return (
    <div className="grid min-h-[260px] place-items-center">
      <div className="glass-card flex flex-col items-center px-10 py-8 text-center">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-pitch-400/30 border-t-pitch-400" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-pitch-400/10" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-300">{label}</p>
      </div>
    </div>
  );
}
