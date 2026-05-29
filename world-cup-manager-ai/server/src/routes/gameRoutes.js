import { Router } from "express";
import {
  getDashboard,
  getNews,
  getSquad,
  getTactics,
  getTournament,
  selectTeam,
  simulateNextMatch,
  updateTactics,
} from "../controllers/gameController.js";
import { protect } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(protect);

router.post("/select-team", asyncHandler(selectTeam));
router.get("/dashboard", asyncHandler(getDashboard));
router.get("/squad", asyncHandler(getSquad));
router.get("/tactics", asyncHandler(getTactics));
router.put("/tactics", asyncHandler(updateTactics));
router.post("/simulate", asyncHandler(simulateNextMatch));
router.get("/tournament", asyncHandler(getTournament));
router.get("/news", asyncHandler(getNews));

export default router;
