import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { hasDatabaseConnection } from "../config/db.js";
import { GameState } from "../models/GameState.js";
import { User } from "../models/User.js";

const DEMO_EMAIL = "demo@worldcupmanager.ai";
const DEMO_USERNAME = "Demo Manager";

function requireDatabase(res) {
  if (hasDatabaseConnection()) return false;
  res.status(503).json({
    message: "MongoDB is not connected. Set MONGO_URI before using authentication.",
  });
  return true;
}

function createToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET || "dev-only-change-me", {
    expiresIn: "7d",
  });
}

export async function register(req, res) {
  if (requireDatabase(res)) return;

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Username, email, and password are required." });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    username,
    email,
    passwordHash,
  });

  return res.status(201).json({
    user: user.toSafeJSON(),
    token: createToken(user),
  });
}

export async function login(req, res) {
  if (requireDatabase(res)) return;

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  const isPasswordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !isPasswordValid) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  return res.json({
    user: user.toSafeJSON(),
    token: createToken(user),
  });
}

// Instant demo access for portfolio visitors. Finds or creates the canonical demo
// account with a random, never-exposed password, then wipes only the demo user's
// GameState so every demo session starts fresh (no team selected) without touching
// any real user's data.
export async function loginDemo(req, res) {
  if (requireDatabase(res)) return;

  let user = await User.findOne({ email: DEMO_EMAIL });

  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
    user = await User.create({ username: DEMO_USERNAME, email: DEMO_EMAIL, passwordHash });
  }

  // Reset the demo save: a fresh GameState (with defaults) is created on first request.
  await GameState.deleteOne({ user: user._id });

  return res.json({
    user: user.toSafeJSON(),
    token: createToken(user),
    demo: true,
    message: "Demo session ready. Pick a nation and start the tournament.",
  });
}

export async function me(req, res) {
  return res.json({ user: req.user.toSafeJSON() });
}
