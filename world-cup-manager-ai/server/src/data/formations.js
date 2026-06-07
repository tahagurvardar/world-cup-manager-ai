// Formation slot definitions shared by squad selection and match simulation.
// Each slot has a stable `id` (unique within the formation) and a base `position`.
// The slot order is significant: it is mirrored by the client pitch coordinates so
// that a stored Starting XI maps to the same on-pitch marker.

export const FORMATION_SLOTS = {
  "4-3-3": [
    { id: "GK", position: "GK" },
    { id: "RB", position: "RB" },
    { id: "CB1", position: "CB" },
    { id: "CB2", position: "CB" },
    { id: "LB", position: "LB" },
    { id: "CM1", position: "CM" },
    { id: "CM2", position: "CM" },
    { id: "DM", position: "DM" },
    { id: "RW", position: "RW" },
    { id: "ST", position: "ST" },
    { id: "LW", position: "LW" },
  ],
  "4-2-3-1": [
    { id: "GK", position: "GK" },
    { id: "RB", position: "RB" },
    { id: "CB1", position: "CB" },
    { id: "CB2", position: "CB" },
    { id: "LB", position: "LB" },
    { id: "DM", position: "DM" },
    { id: "CM", position: "CM" },
    { id: "RW", position: "RW" },
    { id: "AM", position: "AM" },
    { id: "LW", position: "LW" },
    { id: "ST", position: "ST" },
  ],
  "3-5-2": [
    { id: "GK", position: "GK" },
    { id: "CB1", position: "CB" },
    { id: "CB2", position: "CB" },
    { id: "CB3", position: "CB" },
    { id: "RB", position: "RB" },
    { id: "CM1", position: "CM" },
    { id: "DM", position: "DM" },
    { id: "CM2", position: "CM" },
    { id: "LB", position: "LB" },
    { id: "ST1", position: "ST" },
    { id: "ST2", position: "ST" },
  ],
  "4-4-2": [
    { id: "GK", position: "GK" },
    { id: "RB", position: "RB" },
    { id: "CB1", position: "CB" },
    { id: "CB2", position: "CB" },
    { id: "LB", position: "LB" },
    { id: "RW", position: "RW" },
    { id: "CM1", position: "CM" },
    { id: "CM2", position: "CM" },
    { id: "LW", position: "LW" },
    { id: "ST1", position: "ST" },
    { id: "ST2", position: "ST" },
  ],
  "5-3-2": [
    { id: "GK", position: "GK" },
    { id: "RB", position: "RB" },
    { id: "CB1", position: "CB" },
    { id: "CB2", position: "CB" },
    { id: "CB3", position: "CB" },
    { id: "LB", position: "LB" },
    { id: "CM1", position: "CM" },
    { id: "CM2", position: "CM" },
    { id: "DM", position: "DM" },
    { id: "ST1", position: "ST" },
    { id: "ST2", position: "ST" },
  ],
};

export const FORMATIONS = Object.keys(FORMATION_SLOTS);

export const DEFAULT_FORMATION = "4-3-3";

export function getFormationSlots(formation) {
  return FORMATION_SLOTS[formation] || FORMATION_SLOTS[DEFAULT_FORMATION];
}
