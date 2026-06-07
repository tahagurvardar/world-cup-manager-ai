import { Ban, HeartPulse } from "lucide-react";

// Compact availability pill. Renders nothing for available players, an injury pill (red)
// or a suspension pill (amber) otherwise, with matches-remaining when known.
export default function AvailabilityBadge({ availability, showAvailable = false, size = "sm" }) {
  const status = availability?.status || "available";

  if (status === "available") {
    if (!showAvailable) return null;
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pitch-400/12 px-2 py-0.5 text-[11px] font-semibold text-pitch-100">
        Available
      </span>
    );
  }

  const injured = status === "injured";
  const Icon = injured ? HeartPulse : Ban;
  const tone = injured ? "bg-red-500/15 text-red-200 ring-red-400/30" : "bg-amber-400/15 text-amber-200 ring-amber-300/30";
  const matches = availability?.matchesOut ? ` · ${availability.matchesOut}m` : "";
  const padding = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ${tone} ${padding}`} title={availability?.label}>
      <Icon size={12} />
      {injured ? "Injured" : "Suspended"}
      {matches}
    </span>
  );
}
