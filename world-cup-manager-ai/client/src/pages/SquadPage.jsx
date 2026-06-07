import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, GripVertical, Plus, RotateCcw, Save, Search, Shirt, Trash2, UserRound, Wand2 } from "lucide-react";
import Flag from "../components/Flag.jsx";
import AvailabilityBadge from "../components/AvailabilityBadge.jsx";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import TacticalPitch from "../components/TacticalPitch.jsx";
import { autoSquad, fetchSquad, saveSquad } from "../services/gameService";
import { getErrorMessage } from "../services/api";
import { playerRoute } from "../utils/player";

const MAX_BENCH = 12;
const TABS = [
  { id: "full", label: "Full Squad" },
  { id: "xi", label: "Starting XI" },
  { id: "bench", label: "Bench" },
];
const AVAILABILITY_FILTERS = ["ALL", "Available", "Injured", "Suspended"];

function isUnavailable(player) {
  return player?.availability && player.availability.status !== "available";
}

function score(player) {
  return (player?.overall || 0) + (player?.form || 0) * 0.15;
}

const DEF_POS = new Set(["GK", "CB", "RB", "LB"]);
const MID_POS = new Set(["DM", "CM", "AM"]);
const ATT_POS = new Set(["ST", "LW", "RW"]);

export default function SquadPage() {
  const navigate = useNavigate();
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("xi");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");

  // Editable selection state (kept separate from the fetched snapshot).
  const [xi, setXi] = useState([]); // [{ slot, position, playerIndex }]
  const [bench, setBench] = useState([]); // [playerIndex]
  const [armbands, setArmbands] = useState({ captain: null, vice: null });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Tracks the current drag source across the pitch and bench rail.
  const dragRef = useRef(null); // { type: "slot" | "bench", slotIndex?, playerIndex? }

  function applySquad(data) {
    setSquad(data);
    setXi(data.startingXI.map((entry) => ({ slot: entry.slot, position: entry.position, playerIndex: entry.playerIndex })));
    setBench(data.bench.map((player) => player.index));
    setArmbands({ captain: data.captainIndex ?? null, vice: data.viceCaptainIndex ?? null });
    setSelectedSlot(null);
  }

  useEffect(() => {
    let isMounted = true;
    fetchSquad()
      .then((data) => {
        if (isMounted) applySquad(data);
      })
      .catch((requestError) => {
        if (isMounted) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const players = useMemo(() => squad?.players || [], [squad]);
  const playersByIndex = useMemo(() => {
    const map = new Map();
    players.forEach((player) => map.set(player.index, player));
    return map;
  }, [players]);

  const positions = useMemo(() => ["ALL", ...new Set(players.map((player) => player.position))], [players]);
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesPosition = position === "ALL" || player.position === position;
      const statusValue = player.availability?.status || "available";
      const matchesAvailability =
        availabilityFilter === "ALL" ||
        (availabilityFilter === "Available" && statusValue === "available") ||
        (availabilityFilter === "Injured" && statusValue === "injured") ||
        (availabilityFilter === "Suspended" && statusValue === "suspended");
      const text = `${player.name} ${player.club} ${player.position}`.toLowerCase();
      return matchesPosition && matchesAvailability && text.includes(query.toLowerCase());
    });
  }, [players, position, query, availabilityFilter]);

  const xiIndices = useMemo(() => new Set(xi.map((entry) => entry.playerIndex)), [xi]);
  const decoratedXI = useMemo(
    () => xi.map((entry) => ({ ...entry, player: playersByIndex.get(entry.playerIndex) || null })),
    [xi, playersByIndex],
  );

  // Starters who are currently injured/suspended — drives the warning + auto-fix.
  const unavailableInXI = useMemo(
    () => decoratedXI.filter((entry) => isUnavailable(entry.player)),
    [decoratedXI],
  );

  const benchEligible = useMemo(
    () => players.filter((player) => !xiIndices.has(player.index) && !bench.includes(player.index)),
    [players, xiIndices, bench],
  );

  // Live, dynamic team overall + unit ratings derived from the selected eleven.
  const ratings = useMemo(() => {
    const overalls = xi.map((entry) => playersByIndex.get(entry.playerIndex)?.overall).filter((value) => value != null);
    const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
    const unit = (set) => avg(xi.filter((entry) => set.has(entry.position)).map((entry) => playersByIndex.get(entry.playerIndex)?.overall).filter((v) => v != null));
    return { overall: avg(overalls), attack: unit(ATT_POS), midfield: unit(MID_POS), defense: unit(DEF_POS) };
  }, [xi, playersByIndex]);

  // Keeps captain/vice valid (inside the XI, distinct) after a lineup change.
  function fixedCaptains(nextXi, current) {
    const idxSet = new Set(nextXi.map((entry) => entry.playerIndex));
    const ranked = [...idxSet].sort((a, b) => (playersByIndex.get(b)?.overall || 0) - (playersByIndex.get(a)?.overall || 0));
    const captain = idxSet.has(current.captain) ? current.captain : ranked[0] ?? null;
    let vice = idxSet.has(current.vice) ? current.vice : ranked.find((index) => index !== captain) ?? null;
    if (vice === captain) vice = ranked.find((index) => index !== captain) ?? null;
    return { captain, vice };
  }

  function commitLineup(nextXi, nextBench) {
    setMessage("");
    setXi(nextXi);
    if (nextBench) setBench(nextBench);
    setArmbands((current) => fixedCaptains(nextXi, current));
  }

  function swapSlots(a, b) {
    if (a === b) return;
    const next = xi.map((entry) => ({ ...entry }));
    [next[a].playerIndex, next[b].playerIndex] = [next[b].playerIndex, next[a].playerIndex];
    commitLineup(next);
  }

  // Moves a bench player into a pitch slot; the displaced starter takes the bench seat.
  function swapSlotWithBench(slotIndex, benchPlayerIndex) {
    const starter = xi[slotIndex].playerIndex;
    const nextXi = xi.map((entry, index) => (index === slotIndex ? { ...entry, playerIndex: benchPlayerIndex } : entry));
    const nextBench = bench.map((index) => (index === benchPlayerIndex ? starter : index));
    commitLineup(nextXi, nextBench);
  }

  function handleSlotChange(slotIndex, newPlayerIndex) {
    const conflictSlot = xi.findIndex((entry, index) => index !== slotIndex && entry.playerIndex === newPlayerIndex);
    const onBench = bench.includes(newPlayerIndex);
    const previous = xi[slotIndex].playerIndex;
    const nextXi = xi.map((entry, index) => {
      if (index === slotIndex) return { ...entry, playerIndex: newPlayerIndex };
      if (index === conflictSlot) return { ...entry, playerIndex: previous };
      return entry;
    });
    const nextBench = onBench ? bench.map((index) => (index === newPlayerIndex ? previous : index)) : bench;
    commitLineup(nextXi, nextBench);
  }

  // Drag-and-drop wiring shared by the pitch markers and the bench rail.
  function handleSlotDrop(targetSlot) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.type === "slot") swapSlots(drag.slotIndex, targetSlot);
    else if (drag.type === "bench") swapSlotWithBench(targetSlot, drag.playerIndex);
  }

  function handleBenchDrop(benchPlayerIndex) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.type === "slot") swapSlotWithBench(drag.slotIndex, benchPlayerIndex);
  }

  // Tap-to-swap fallback for touch / accessibility: tap a player, then a target.
  function handleSlotClick(slotIndex) {
    setSelectedSlot((current) => {
      if (current === null) return slotIndex;
      if (current === slotIndex) return null;
      swapSlots(current, slotIndex);
      return null;
    });
  }

  function setCaptain(playerIndex) {
    setMessage("");
    setArmbands((current) => ({ captain: playerIndex, vice: current.vice === playerIndex ? current.captain : current.vice }));
  }

  function setVice(playerIndex) {
    setMessage("");
    setArmbands((current) => ({ vice: playerIndex, captain: current.captain === playerIndex ? current.vice : current.captain }));
  }

  function handleAddToBench(playerIndex) {
    if (playerIndex === "" || bench.length >= MAX_BENCH) return;
    setMessage("");
    setBench((current) => (current.includes(Number(playerIndex)) ? current : [...current, Number(playerIndex)]));
  }

  function handleRemoveFromBench(playerIndex) {
    setMessage("");
    setBench((current) => current.filter((index) => index !== playerIndex));
  }

  function openPlayer(playerIndex) {
    if (playerIndex != null && squad?.teamCode) navigate(playerRoute(squad.teamCode, playerIndex));
  }

  // Replaces every unavailable starter with the best available bench/reserve player so the
  // XI is legal before saving (mirrors the server's pre-match auto-replacement).
  function handleAutoFix() {
    setMessage("");
    const used = new Set(xi.map((entry) => entry.playerIndex));
    const nextXi = xi.map((entry) => ({ ...entry }));
    let fixes = 0;

    nextXi.forEach((entry) => {
      const player = playersByIndex.get(entry.playerIndex);
      if (!isUnavailable(player)) return;
      used.delete(entry.playerIndex);

      const candidates = players
        .filter((candidate) => !used.has(candidate.index) && !isUnavailable(candidate))
        .sort((a, b) => score(b) - score(a));
      const samePosition = candidates.find((candidate) => candidate.position === entry.position);
      const replacement = samePosition || candidates[0];

      if (replacement) {
        entry.playerIndex = replacement.index;
        used.add(replacement.index);
        fixes += 1;
      } else {
        used.add(entry.playerIndex);
      }
    });

    if (!fixes) return;
    setXi(nextXi);
    setBench((current) => current.filter((index) => !nextXi.some((entry) => entry.playerIndex === index)));
    setArmbands((current) => fixedCaptains(nextXi, current));
    setMessage(`Auto-fixed ${fixes} unavailable ${fixes > 1 ? "players" : "player"}. Remember to save.`);
  }

  async function handleAutoGenerate() {
    setError("");
    setMessage("");
    try {
      const data = await autoSquad(squad?.formation);
      setXi(data.startingXI.map((entry) => ({ slot: entry.slot, position: entry.position, playerIndex: entry.playerIndex })));
      setBench(data.bench.map((player) => player.index));
      setArmbands({ captain: data.captainIndex ?? null, vice: data.viceCaptainIndex ?? null });
      setSelectedSlot(null);
      setMessage("Suggested Starting XI loaded. Remember to save.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await saveSquad({ startingXI: xi, bench, captainIndex: armbands.captain, viceCaptainIndex: armbands.vice });
      applySquad(data);
      setMessage("Squad saved. This Starting XI will be used in the next match.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading squad..." />;

  if (!squad) {
    return (
      <Panel className="p-6">
        <h1 className="text-2xl font-semibold text-white">Squad unavailable</h1>
        <p className="mt-2 text-sm text-slate-400">{error || "Select a national team first to manage your squad."}</p>
      </Panel>
    );
  }

  return (
    <>
      <PageHeader
        icon={Shirt}
        title={`${squad.team} Squad`}
        description="Manage your full player pool, build a Starting XI for the active formation, pick a captain, and set the matchday bench."
        action={
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-pitch-300/25 bg-pitch-400/10 px-3 py-1.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pitch-200">XI Overall</p>
              <p className="text-xl font-black text-white">{ratings.overall || squad.teamOverall}</p>
            </div>
            <span className="chip border-pitch-300/25 bg-pitch-400/10 text-pitch-100">{squad.formation}</span>
            {squad.flag ? <Flag src={squad.flag} alt={`${squad.team} flag`} size="lg" /> : null}
          </div>
        }
      />

      {message ? <p className="mb-4 rounded-xl border border-pitch-300/20 bg-pitch-400/10 px-3 py-2 text-sm text-pitch-100">{message}</p> : null}
      {error ? <p className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

      {squad.availability ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <AvailabilitySummaryChip label="Available" value={squad.availability.available} tone="green" />
          <AvailabilitySummaryChip label="Injured" value={squad.availability.injuredCount} tone="red" />
          <AvailabilitySummaryChip label="Suspended" value={squad.availability.suspendedCount} tone="amber" />
        </div>
      ) : null}

      {tab !== "full" && unavailableInXI.length ? (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-amber-500/[0.08] p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-amber-100">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" />
            <span>
              {unavailableInXI.length} unavailable {unavailableInXI.length > 1 ? "players are" : "player is"} in your Starting XI
              ({unavailableInXI.map((entry) => entry.player?.name).filter(Boolean).join(", ")}). They will be auto-replaced at kickoff.
            </span>
          </p>
          <button type="button" onClick={handleAutoFix} className="btn-ghost shrink-0 px-3 py-2">
            <Wand2 size={16} />
            Auto-fix lineup
          </button>
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === item.id ? "bg-pitch-400 text-ink-950 shadow-glow" : "text-slate-300 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab !== "full" ? (
          <div className="flex gap-2">
            <button type="button" onClick={handleAutoGenerate} className="btn-ghost px-3 py-2">
              <RotateCcw size={16} />
              Auto-generate
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2">
              <Save size={16} />
              {saving ? "Saving..." : "Save Squad"}
            </button>
          </div>
        ) : null}
      </div>

      {tab === "full" ? (
        <FullSquad
          players={filteredPlayers}
          total={players.length}
          positions={positions}
          query={query}
          setQuery={setQuery}
          position={position}
          setPosition={setPosition}
          availabilityFilter={availabilityFilter}
          setAvailabilityFilter={setAvailabilityFilter}
          xiIndices={xiIndices}
          benchIndices={bench}
          captainIndex={armbands.captain}
          viceIndex={armbands.vice}
          onOpenPlayer={openPlayer}
        />
      ) : null}

      {tab === "xi" ? (
        <StartingXITab
          formation={squad.formation}
          decoratedXI={decoratedXI}
          players={players}
          playersByIndex={playersByIndex}
          bench={bench}
          ratings={ratings}
          teamOverall={squad.teamOverall}
          armbands={armbands}
          selectedSlot={selectedSlot}
          dragRef={dragRef}
          onSlotChange={handleSlotChange}
          onSlotDrop={handleSlotDrop}
          onSlotClick={handleSlotClick}
          onBenchDrop={handleBenchDrop}
          onSetCaptain={setCaptain}
          onSetVice={setVice}
          onOpenPlayer={openPlayer}
        />
      ) : null}

      {tab === "bench" ? (
        <BenchTab
          bench={bench}
          playersByIndex={playersByIndex}
          eligible={benchEligible}
          onAdd={handleAddToBench}
          onRemove={handleRemoveFromBench}
          onOpenPlayer={openPlayer}
        />
      ) : null}
    </>
  );
}

function PlayerRoleBadge({ position }) {
  return <span className="rounded-md bg-pitch-400/10 px-2 py-1 text-xs font-semibold text-pitch-100">{position}</span>;
}

function ArmbandTag({ captain, vice }) {
  if (captain) return <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black text-amber-200">C</span>;
  if (vice) return <span className="rounded bg-slate-300/20 px-1.5 py-0.5 text-[10px] font-black text-slate-200">V</span>;
  return null;
}

function StartingXITab({
  formation,
  decoratedXI,
  players,
  playersByIndex,
  bench,
  ratings,
  teamOverall,
  armbands,
  selectedSlot,
  dragRef,
  onSlotChange,
  onSlotDrop,
  onSlotClick,
  onBenchDrop,
  onSetCaptain,
  onSetVice,
  onOpenPlayer,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,440px)_1fr]">
      <Panel className="p-5">
        <TacticalPitch
          formation={formation}
          startingXI={decoratedXI}
          title="Starting XI"
          subtitle="Drag players to swap · tap two to switch"
          interactive
          captainPlayerIndex={armbands.captain}
          vicePlayerIndex={armbands.vice}
          selectedSlot={selectedSlot}
          onSlotDragStart={(slotIndex) => {
            dragRef.current = { type: "slot", slotIndex };
          }}
          onSlotDrop={onSlotDrop}
          onSlotClick={onSlotClick}
        />

        <BenchRail bench={bench} playersByIndex={playersByIndex} dragRef={dragRef} onBenchDrop={onBenchDrop} />
      </Panel>

      <div className="space-y-6">
        <Panel className="p-5">
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="rounded-2xl bg-gradient-to-br from-pitch-400/20 to-pitch-500/5 px-6 py-4 text-center ring-1 ring-pitch-300/25">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pitch-200">Team Overall</p>
              <p className="text-4xl font-black text-white">{ratings.overall || teamOverall}</p>
              <p className="mt-1 text-[11px] text-slate-400">Base nation {teamOverall}</p>
            </div>
            <div className="space-y-2">
              <UnitBar label="Attack" value={ratings.attack} />
              <UnitBar label="Midfield" value={ratings.midfield} />
              <UnitBar label="Defense" value={ratings.defense} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ArmbandSelect label="Captain" tone="amber" value={armbands.captain} decoratedXI={decoratedXI} onChange={onSetCaptain} />
            <ArmbandSelect label="Vice-Captain" tone="slate" value={armbands.vice} decoratedXI={decoratedXI} onChange={onSetVice} />
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="py-3 pr-4">Slot</th>
                  <th className="py-3 pr-4">Player</th>
                  <th className="py-3 pr-4">OVR</th>
                  <th className="py-3 pr-4">Form</th>
                  <th className="py-3 pr-4">Morale</th>
                  <th className="py-3 pr-4">Stamina</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {decoratedXI.map((entry, slotIndex) => (
                  <tr key={entry.slot} className={`text-slate-300 transition hover:bg-white/[0.03] ${isUnavailable(entry.player) ? "opacity-70" : ""}`}>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-2">
                        <PlayerRoleBadge position={entry.position} />
                        <ArmbandTag captain={entry.playerIndex === armbands.captain} vice={entry.playerIndex === armbands.vice} />
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col gap-1">
                        <select
                          value={entry.playerIndex}
                          onChange={(event) => onSlotChange(slotIndex, Number(event.target.value))}
                          className={`w-full max-w-[260px] rounded-lg border bg-ink-850 px-3 py-2 text-sm text-white outline-none focus:border-pitch-300 ${
                            isUnavailable(entry.player) ? "border-amber-400/40" : "border-white/10"
                          }`}
                        >
                          {players.map((player) => (
                            <option key={player.index} value={player.index}>
                              {player.name} ({player.position} · {player.overall})
                              {isUnavailable(player) ? ` — ${player.availability.status}` : ""}
                            </option>
                          ))}
                        </select>
                        {isUnavailable(entry.player) ? <AvailabilityBadge availability={entry.player.availability} /> : null}
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-pitch-100">{entry.player?.overall ?? "—"}</td>
                    <td className="py-3 pr-4">{entry.player?.form ?? "—"}</td>
                    <td className="py-3 pr-4">{entry.player?.morale ?? "—"}</td>
                    <td className="py-3 pr-4">{entry.player?.stamina ?? "—"}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => onOpenPlayer(entry.playerIndex)}
                        aria-label="View player profile"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:border-pitch-300/40 hover:text-pitch-100"
                      >
                        <UserRound size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function BenchRail({ bench, playersByIndex, dragRef, onBenchDrop }) {
  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        <Shirt size={14} /> Bench · drag onto the pitch
      </p>
      {bench.length ? (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {bench.map((index) => {
            const player = playersByIndex.get(index);
            if (!player) return null;
            return (
              <div
                key={index}
                draggable
                onDragStart={() => {
                  dragRef.current = { type: "bench", playerIndex: index };
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onBenchDrop(index)}
                className="flex min-w-[140px] cursor-grab items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:border-pitch-300/40 active:cursor-grabbing"
              >
                <GripVertical size={14} className="shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className={`truncate text-sm font-medium ${isUnavailable(player) ? "text-slate-400" : "text-white"}`}>{player.name}</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    {player.position} · {player.overall}
                    <AvailabilityBadge availability={player.availability} size="xs" />
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-slate-500">
          No bench players. Add them on the Bench tab.
        </p>
      )}
    </div>
  );
}

function UnitBar({ label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-semibold text-slate-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full bg-gradient-to-r from-pitch-400 to-pitch-500 transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="w-7 text-right text-sm font-bold text-white">{value || "—"}</span>
    </div>
  );
}

function ArmbandSelect({ label, tone, value, decoratedXI, onChange }) {
  const ring = tone === "amber" ? "ring-amber-300/30" : "ring-slate-300/30";
  const badge = tone === "amber" ? "bg-amber-400/20 text-amber-200" : "bg-slate-300/20 text-slate-200";
  return (
    <label className={`block rounded-xl border border-white/10 bg-white/[0.03] p-3 ring-1 ${ring}`}>
      <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-black ${badge}`}>{tone === "amber" ? "C" : "V"}</span>
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-white/10 bg-ink-850 px-3 py-2 text-sm text-white outline-none focus:border-pitch-300"
      >
        {decoratedXI.map((entry) => (
          <option key={entry.slot} value={entry.playerIndex}>
            {entry.player?.name} ({entry.position})
          </option>
        ))}
      </select>
    </label>
  );
}

function FullSquad({ players, total, positions, query, setQuery, position, setPosition, availabilityFilter, setAvailabilityFilter, xiIndices, benchIndices, captainIndex, viceIndex, onOpenPlayer }) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Shirt size={18} className="text-pitch-200" />
          {total} registered players
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search players"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-pitch-300 sm:w-64"
            />
          </label>
          <select
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className="rounded-lg border border-white/10 bg-ink-850 px-3 py-2.5 text-sm text-white outline-none focus:border-pitch-300"
          >
            {positions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5 flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 text-sm sm:w-fit">
        {AVAILABILITY_FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setAvailabilityFilter(item)}
            className={`rounded-lg px-3 py-1.5 font-semibold transition ${
              availabilityFilter === item ? "bg-pitch-400 text-ink-950" : "text-slate-400 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="py-3 pr-4">Player</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Age</th>
              <th className="py-3 pr-4">Pos</th>
              <th className="py-3 pr-4">Club</th>
              <th className="py-3 pr-4">OVR</th>
              <th className="py-3 pr-4">PAC</th>
              <th className="py-3 pr-4">SHO</th>
              <th className="py-3 pr-4">PAS</th>
              <th className="py-3 pr-4">DEF</th>
              <th className="py-3 pr-4">PHY</th>
              <th className="py-3 pr-4">Form</th>
              <th className="py-3 pr-4">Morale</th>
              <th className="py-3">Stamina</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {players.map((player) => (
              <tr key={player.index} className={`text-slate-300 transition hover:bg-white/[0.03] ${isUnavailable(player) ? "opacity-60" : ""}`}>
                <td className="py-3 pr-4 font-medium text-white">
                  <span className="flex items-center gap-2">
                    <button type="button" onClick={() => onOpenPlayer(player.index)} className="text-left font-medium text-white transition hover:text-pitch-100 hover:underline">
                      {player.name}
                    </button>
                    <ArmbandTag captain={player.index === captainIndex} vice={player.index === viceIndex} />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {xiIndices.has(player.index) ? (
                    <span className="rounded bg-pitch-400/15 px-2 py-0.5 text-xs font-semibold text-pitch-100">XI</span>
                  ) : benchIndices.includes(player.index) ? (
                    <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-300">Bench</span>
                  ) : (
                    <span className="text-xs text-slate-600">Reserve</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {isUnavailable(player) ? <AvailabilityBadge availability={player.availability} /> : <span className="text-xs text-slate-600">—</span>}
                </td>
                <td className="py-3 pr-4">{player.age}</td>
                <td className="py-3 pr-4"><PlayerRoleBadge position={player.position} /></td>
                <td className="py-3 pr-4">{player.club}</td>
                <td className="py-3 pr-4 font-semibold text-pitch-100">{player.overall}</td>
                <td className="py-3 pr-4">{player.pace}</td>
                <td className="py-3 pr-4">{player.shooting}</td>
                <td className="py-3 pr-4">{player.passing}</td>
                <td className="py-3 pr-4">{player.defending}</td>
                <td className="py-3 pr-4">{player.physical}</td>
                <td className="py-3 pr-4">{player.form}</td>
                <td className="py-3 pr-4">{player.morale}</td>
                <td className="py-3">{player.stamina}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function BenchTab({ bench, playersByIndex, eligible, onAdd, onRemove, onOpenPlayer }) {
  const [selected, setSelected] = useState("");

  return (
    <Panel className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Shirt size={18} className="text-pitch-200" />
          {bench.length} of {MAX_BENCH} bench players
        </div>
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="rounded-lg border border-white/10 bg-ink-850 px-3 py-2 text-sm text-white outline-none focus:border-pitch-300"
          >
            <option value="">Add player to bench…</option>
            {eligible.map((player) => (
              <option key={player.index} value={player.index}>
                {player.name} ({player.position} · {player.overall})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              onAdd(selected);
              setSelected("");
            }}
            disabled={selected === "" || bench.length >= MAX_BENCH}
            className="btn-ghost px-3 py-2 disabled:opacity-50"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {bench.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bench.map((index) => {
            const player = playersByIndex.get(index);
            if (!player) return null;
            return (
              <div key={index} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-pitch-300/30">
                <div className="min-w-0">
                  <button type="button" onClick={() => onOpenPlayer(index)} className="truncate text-left font-medium text-white transition hover:text-pitch-100 hover:underline">
                    {player.name}
                  </button>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <PlayerRoleBadge position={player.position} />
                    OVR {player.overall} · Form {player.form}
                    <AvailabilityBadge availability={player.availability} size="xs" />
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:border-red-400/40 hover:text-red-200"
                  aria-label={`Remove ${player.name} from bench`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-400">
          No bench players selected. Add up to {MAX_BENCH} players from the squad.
        </p>
      )}
    </Panel>
  );
}

function AvailabilitySummaryChip({ label, value, tone }) {
  const tones = {
    green: "border-pitch-300/25 bg-pitch-400/10 text-pitch-100",
    red: "border-red-400/25 bg-red-500/10 text-red-200",
    amber: "border-amber-300/25 bg-amber-400/10 text-amber-200",
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold ${tones[tone] || tones.green}`}>
      {label}
      <span className="rounded-md bg-black/20 px-1.5 text-xs font-bold">{value ?? 0}</span>
    </span>
  );
}
