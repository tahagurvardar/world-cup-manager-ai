import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    name: String,
    age: Number,
    nationality: String,
    position: String,
    club: String,
    overall: Number,
    pace: Number,
    shooting: Number,
    passing: Number,
    defending: Number,
    physical: Number,
    form: Number,
    morale: Number,
    stamina: Number,
  },
  { _id: false },
);

const teamSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    group: { type: String, required: true },
    region: String,
    confederation: String,
    flag: String,
    overall: Number,
    morale: Number,
    form: Number,
    style: String,
    strengths: [String],
    weaknesses: [String],
    players: [playerSchema],
  },
  { timestamps: true },
);

export const Team = mongoose.model("Team", teamSchema);
