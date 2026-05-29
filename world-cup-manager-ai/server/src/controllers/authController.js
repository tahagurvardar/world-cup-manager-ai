import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { hasDatabaseConnection } from "../config/db.js";
import { User } from "../models/User.js";

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

export async function me(req, res) {
  return res.json({ user: req.user.toSafeJSON() });
}
