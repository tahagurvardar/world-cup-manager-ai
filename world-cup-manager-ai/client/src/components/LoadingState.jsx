export default function LoadingState({ label = "Loading match data..." }) {
  return (
    <div className="grid min-h-[240px] place-items-center rounded-lg border border-white/10 bg-white/[0.035]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-pitch-300 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}
