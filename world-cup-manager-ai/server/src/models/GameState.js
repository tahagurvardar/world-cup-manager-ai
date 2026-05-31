import mongoose from "mongoose";

export const DEFAULT_TACTICS = {
  formation: "4-3-3",
  mentality: "balanced",
  pressing: "medium",
  tempo: "normal",
  defensiveLine: "medium",
};

const tacticsSchema = new mongoose.Schema(
  {
    formation: {
      type: String,
      enum: ["4-3-3", "4-2-3-1", "3-5-2", "4-4-2", "5-3-2"],
      default: DEFAULT_TACTICS.formation,
    },
    mentality: {
      type: String,
      enum: ["defensive", "balanced", "attacking"],
      default: DEFAULT_TACTICS.mentality,
    },
    pressing: {
      type: String,
      enum: ["low", "medium", "high"],
      default: DEFAULT_TACTICS.pressing,
    },
    tempo: {
      type: String,
      enum: ["slow", "normal", "fast"],
      default: DEFAULT_TACTICS.tempo,
    },
    defensiveLine: {
      type: String,
      enum: ["low", "medium", "high"],
      default: DEFAULT_TACTICS.defensiveLine,
    },
  },
  { _id: false },
);

const gameStateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    selectedTeamCode: { type: String, default: null },
    tactics: { type: tacticsSchema, default: () => ({ ...DEFAULT_TACTICS }) },
    results: [{ type: mongoose.Schema.Types.Mixed }],
    news: [{ type: mongoose.Schema.Types.Mixed }],
    playerStats: { type: mongoose.Schema.Types.Mixed, default: () => ({ players: [], leaders: {} }) },
    tournamentAwards: { type: mongoose.Schema.Types.Mixed, default: () => ({ completed: false, podium: {}, individual: {} }) },
    currentStage: { type: String, default: "group" },
  },
  { timestamps: true },
);

export const GameState = mongoose.model("GameState", gameStateSchema);
