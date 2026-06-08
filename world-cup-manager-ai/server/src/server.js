import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

function validateRuntimeConfig() {
  const missing = [];
  const weakJwtSecret = !process.env.JWT_SECRET || process.env.JWT_SECRET === "change_this_secret";

  if (!process.env.MONGO_URI) missing.push("MONGO_URI");
  if (weakJwtSecret) missing.push("JWT_SECRET");

  if (isProduction && missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  if (weakJwtSecret) {
    console.warn("JWT_SECRET is missing or still using the example value. Set a long random secret in server/.env.");
  }
}

async function startServer() {
  validateRuntimeConfig();

  try {
    await connectDB();
  } catch (error) {
    if (isProduction) throw error;
    console.warn("Starting API without MongoDB. Fix MONGO_URI to enable auth and persistence.");
  }

  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start API:", error.message);
  process.exit(1);
});
