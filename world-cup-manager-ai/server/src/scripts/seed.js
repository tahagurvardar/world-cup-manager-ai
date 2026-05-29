import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Team } from "../models/Team.js";
import { teams } from "../data/teams.js";

async function seed() {
  const connection = await connectDB();

  if (!connection) {
    throw new Error("MONGO_URI is required to seed MongoDB.");
  }

  const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
  const collectionNames = new Set(collections.map((collection) => collection.name));

  await Team.deleteMany({});
  for (const collectionName of ["players", "fixtures"]) {
    if (collectionNames.has(collectionName)) {
      await mongoose.connection.db.collection(collectionName).deleteMany({});
    }
  }

  const insertedTeams = await Team.insertMany(teams);
  const playerCount = insertedTeams.reduce((total, team) => total + team.players.length, 0);

  console.log(`Inserted ${insertedTeams.length} teams.`);
  console.log(`Inserted ${playerCount} players.`);
}

seed()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  });
