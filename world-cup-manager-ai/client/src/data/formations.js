// Pitch coordinates for every formation slot. The slot ids and their order match the
// server definition in server/src/data/formations.js so a stored Starting XI lines up
// with the correct marker. Coordinates are percentages: x is left->right (0-100), y is
// top->bottom (0 = attacking third, 100 = own goal line).

export const FORMATION_LAYOUTS = {
  "4-3-3": [
    { id: "GK", position: "GK", x: 50, y: 92 },
    { id: "RB", position: "RB", x: 82, y: 72 },
    { id: "CB1", position: "CB", x: 60, y: 76 },
    { id: "CB2", position: "CB", x: 40, y: 76 },
    { id: "LB", position: "LB", x: 18, y: 72 },
    { id: "CM1", position: "CM", x: 66, y: 48 },
    { id: "CM2", position: "CM", x: 34, y: 48 },
    { id: "DM", position: "DM", x: 50, y: 58 },
    { id: "RW", position: "RW", x: 80, y: 22 },
    { id: "ST", position: "ST", x: 50, y: 12 },
    { id: "LW", position: "LW", x: 20, y: 22 },
  ],
  "4-2-3-1": [
    { id: "GK", position: "GK", x: 50, y: 92 },
    { id: "RB", position: "RB", x: 82, y: 72 },
    { id: "CB1", position: "CB", x: 60, y: 76 },
    { id: "CB2", position: "CB", x: 40, y: 76 },
    { id: "LB", position: "LB", x: 18, y: 72 },
    { id: "DM", position: "DM", x: 38, y: 56 },
    { id: "CM", position: "CM", x: 62, y: 56 },
    { id: "RW", position: "RW", x: 82, y: 34 },
    { id: "AM", position: "AM", x: 50, y: 38 },
    { id: "LW", position: "LW", x: 18, y: 34 },
    { id: "ST", position: "ST", x: 50, y: 14 },
  ],
  "3-5-2": [
    { id: "GK", position: "GK", x: 50, y: 92 },
    { id: "CB1", position: "CB", x: 68, y: 76 },
    { id: "CB2", position: "CB", x: 50, y: 78 },
    { id: "CB3", position: "CB", x: 32, y: 76 },
    { id: "RB", position: "RB", x: 86, y: 54 },
    { id: "CM1", position: "CM", x: 64, y: 50 },
    { id: "DM", position: "DM", x: 50, y: 58 },
    { id: "CM2", position: "CM", x: 36, y: 50 },
    { id: "LB", position: "LB", x: 14, y: 54 },
    { id: "ST1", position: "ST", x: 60, y: 16 },
    { id: "ST2", position: "ST", x: 40, y: 16 },
  ],
  "4-4-2": [
    { id: "GK", position: "GK", x: 50, y: 92 },
    { id: "RB", position: "RB", x: 82, y: 72 },
    { id: "CB1", position: "CB", x: 60, y: 76 },
    { id: "CB2", position: "CB", x: 40, y: 76 },
    { id: "LB", position: "LB", x: 18, y: 72 },
    { id: "RW", position: "RW", x: 82, y: 46 },
    { id: "CM1", position: "CM", x: 60, y: 50 },
    { id: "CM2", position: "CM", x: 40, y: 50 },
    { id: "LW", position: "LW", x: 18, y: 46 },
    { id: "ST1", position: "ST", x: 60, y: 16 },
    { id: "ST2", position: "ST", x: 40, y: 16 },
  ],
  "5-3-2": [
    { id: "GK", position: "GK", x: 50, y: 92 },
    { id: "RB", position: "RB", x: 86, y: 68 },
    { id: "CB1", position: "CB", x: 66, y: 76 },
    { id: "CB2", position: "CB", x: 50, y: 78 },
    { id: "CB3", position: "CB", x: 34, y: 76 },
    { id: "LB", position: "LB", x: 14, y: 68 },
    { id: "CM1", position: "CM", x: 66, y: 48 },
    { id: "CM2", position: "CM", x: 34, y: 48 },
    { id: "DM", position: "DM", x: 50, y: 56 },
    { id: "ST1", position: "ST", x: 60, y: 16 },
    { id: "ST2", position: "ST", x: 40, y: 16 },
  ],
};

export const FORMATIONS = Object.keys(FORMATION_LAYOUTS);

export const DEFAULT_FORMATION = "4-3-3";

export function getFormationLayout(formation) {
  return FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS[DEFAULT_FORMATION];
}

// Merges a Starting XI (array of { slot, position, player }) with the pitch layout so
// each entry carries its x/y coordinates. Falls back to layout order when slot ids are
// missing so the component still renders something sensible.
export function placeStartingXI(formation, startingXI = []) {
  const layout = getFormationLayout(formation);
  const bySlot = new Map(startingXI.map((entry) => [entry.slot, entry]));

  return layout.map((slot, index) => {
    const entry = bySlot.get(slot.id) || startingXI[index] || {};
    return {
      ...slot,
      player: entry.player || null,
      playerIndex: entry.playerIndex,
    };
  });
}
