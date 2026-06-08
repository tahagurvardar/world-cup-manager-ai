import cors from "cors";
import express from "express";
import morgan from "morgan";
import aiRoutes from "./routes/aiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();

const defaultClientOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

function parseAllowedOrigins() {
  const configuredOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL;
  const origins = configuredOrigins
    ? configuredOrigins
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : defaultClientOrigins;

  return new Set(origins);
}

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "world-cup-manager-ai-server",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/ai", aiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
