import { useState } from "react";
import { placeStartingXI } from "../data/formations";

// Reusable tactical pitch card. Renders the selected formation's Starting XI as shirt
// markers on a textured football pitch. Read-only by default; when `interactive` is set
// the markers become drag-and-drop / click targets for lineup editing (used on the Squad
// Starting XI tab). Also used read-only on the Dashboard and Tactics preview.
export default function TacticalPitch({
  formation = "4-3-3",
  startingXI = [],
  title,
  subtitle,
  className = "",
  interactive = false,
  captainPlayerIndex = null,
  vicePlayerIndex = null,
  selectedSlot = null,
  onSlotDragStart,
  onSlotDrop,
  onSlotClick,
}) {
  const markers = placeStartingXI(formation, startingXI);
  const [hoverSlot, setHoverSlot] = useState(null);

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">{title}</h3>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <span className="chip border-pitch-300/30 bg-pitch-400/10 text-pitch-100">{formation}</span>
        </div>
      ) : null}

      <div
        className="pitch-turf relative w-full overflow-hidden rounded-2xl border border-pitch-300/25 shadow-[inset_0_0_60px_rgba(0,0,0,0.45)]"
        style={{ aspectRatio: "3 / 4" }}
      >
        <PitchLines />
        <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]" aria-hidden="true" />

        {markers.map((marker, index) => (
          <PlayerMarker
            key={marker.id}
            marker={marker}
            number={index + 1}
            interactive={interactive}
            isCaptain={marker.playerIndex != null && marker.playerIndex === captainPlayerIndex}
            isVice={marker.playerIndex != null && marker.playerIndex === vicePlayerIndex}
            isSelected={selectedSlot === index}
            isHover={hoverSlot === index}
            onDragStart={() => onSlotDragStart?.(index)}
            onDragEnter={() => setHoverSlot(index)}
            onDragLeave={() => setHoverSlot((current) => (current === index ? null : current))}
            onDrop={() => {
              setHoverSlot(null);
              onSlotDrop?.(index);
            }}
            onClick={() => onSlotClick?.(index)}
          />
        ))}
      </div>
    </div>
  );
}

function PitchLines() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-[4%] rounded-md border border-white/30" />
      <div className="absolute left-[4%] right-[4%] top-1/2 border-t border-white/30" />
      <div className="absolute left-1/2 top-1/2 h-[18%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />
      <div className="absolute left-1/2 top-[4%] h-[14%] w-[46%] -translate-x-1/2 border border-white/30 border-t-0" />
      <div className="absolute left-1/2 top-[4%] h-[6%] w-[20%] -translate-x-1/2 border border-white/30 border-t-0" />
      <div className="absolute left-1/2 top-[18%] h-[7%] w-[16%] -translate-x-1/2 rounded-b-full border-b border-white/25" />
      <div className="absolute bottom-[4%] left-1/2 h-[14%] w-[46%] -translate-x-1/2 border border-white/30 border-b-0" />
      <div className="absolute bottom-[4%] left-1/2 h-[6%] w-[20%] -translate-x-1/2 border border-white/30 border-b-0" />
      <div className="absolute bottom-[18%] left-1/2 h-[7%] w-[16%] -translate-x-1/2 rounded-t-full border-t border-white/25" />
    </div>
  );
}

function PlayerMarker({
  marker,
  number,
  interactive,
  isCaptain,
  isVice,
  isSelected,
  isHover,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDrop,
  onClick,
}) {
  const player = marker.player;
  const overall = player?.overall;
  const lastName = player?.name ? player.name.split(" ").slice(-1)[0] : "—";
  const availability = player?.availability;
  const unavailable = availability && availability.status !== "available";

  const dragProps = interactive
    ? {
        draggable: true,
        onDragStart,
        onDragEnter,
        onDragLeave,
        onDragOver: (event) => event.preventDefault(),
        onDrop,
        onClick,
        role: "button",
        tabIndex: 0,
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick?.();
          }
        },
      }
    : {};

  return (
    <div
      {...dragProps}
      className={`group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-transform duration-150 ${
        interactive ? "cursor-grab active:cursor-grabbing hover:z-10 hover:scale-110" : "hover:z-10 hover:scale-105"
      } ${isSelected ? "z-10 scale-110" : ""}`}
      style={{ left: `${marker.x}%`, top: `${marker.y}%`, width: "26%" }}
    >
      <div
        className={`relative grid h-9 w-9 place-items-center rounded-full border bg-gradient-to-b from-ink-900/95 to-ink-950 text-xs font-bold text-white shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition sm:h-10 sm:w-10 ${
          unavailable
            ? availability.status === "injured"
              ? "border-red-400 ring-2 ring-red-400/70"
              : "border-amber-400 ring-2 ring-amber-400/70"
            : isSelected
              ? "border-pitch-300 ring-2 ring-pitch-300"
              : isHover
                ? "border-pitch-300 ring-2 ring-pitch-300/70"
                : "border-white/50"
        } ${unavailable ? "opacity-70" : ""}`}
      >
        {number}
        {overall != null ? (
          <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-gradient-to-b from-pitch-300 to-pitch-500 text-[9px] font-bold text-ink-950 shadow">
            {overall}
          </span>
        ) : null}
        {unavailable ? <AvailabilityFlag status={availability.status} /> : null}
        {isCaptain ? <ArmBand label="C" tone="amber" /> : isVice ? <ArmBand label="V" tone="slate" /> : null}
      </div>
      <span className="mt-1 max-w-full truncate rounded bg-ink-950/75 px-1.5 text-[10px] font-semibold leading-tight text-white backdrop-blur-sm">
        {lastName}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-wide text-pitch-200">{marker.position}</span>
    </div>
  );
}

function AvailabilityFlag({ status }) {
  const injured = status === "injured";
  return (
    <span
      className={`absolute -left-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full text-[9px] font-black shadow ring-1 ring-black/20 ${
        injured ? "bg-red-500 text-white" : "bg-amber-400 text-ink-950"
      }`}
      title={injured ? "Injured" : "Suspended"}
    >
      {injured ? "+" : "!"}
    </span>
  );
}

function ArmBand({ label, tone }) {
  const color = tone === "amber" ? "from-amber-300 to-amber-500 text-ink-950" : "from-slate-200 to-slate-400 text-ink-950";
  return (
    <span className={`absolute -bottom-1 -left-1.5 grid h-4 w-4 place-items-center rounded-full bg-gradient-to-b ${color} text-[9px] font-black shadow ring-1 ring-black/20`}>
      {label}
    </span>
  );
}
