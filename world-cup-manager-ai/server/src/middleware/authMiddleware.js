import jwt from "jsonwebtoken";
import { hasDatabaseConnection } from "../config/db.js";
import { User } from "../models/User.js";

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-only-change-me";
}

export async function protect(req, res, next) {
  if (!hasDatabaseConnection()) {
    return res.status(503).json({
      message: "MongoDB is not connected. Protected routes require MONGO_URI.",
    });
  }

  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing bearer token." });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}
