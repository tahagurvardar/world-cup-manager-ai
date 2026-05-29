import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const port = process.env.PORT || 5000;

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change_this_secret") {
    console.warn("JWT_SECRET is missing or still using the example value. Set a long random secret in server/.env.");
  }

  try {
    await connectDB();
  } catch (error) {
    console.warn("Starting API without MongoDB. Fix MONGO_URI to enable auth and persistence.");
  }

  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

startServer();
