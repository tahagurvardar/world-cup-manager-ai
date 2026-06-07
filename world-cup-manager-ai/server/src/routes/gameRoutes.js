import { Router } from "express";
import {
  autoSquad,
  getDashboard,
  getNews,
  getPlayerProfile,
  getPressConference,
  getSquad,
  getTactics,
  getTournament,
  selectTeam,
  simulateNextMatch,
  startNewTournament,
  submitPressConference,
  updateSquad,
  updateTactics,
} from "../controllers/gameController.js";
import { protect } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(protect);

router.post("/select-team", asyncHandler(selectTeam));
router.post("/new-tournament", asyncHandler(startNewTournament));
router.get("/dashboard", asyncHandler(getDashboard));
router.get("/squad", asyncHandler(getSquad));
router.put("/squad", asyncHandler(updateSquad));
router.post("/squad/auto", asyncHandler(autoSquad));
router.get("/player/:playerId", asyncHandler(getPlayerProfile));
router.get("/press-conference", asyncHandler(getPressConference));
router.post("/press-conference", asyncHandler(submitPressConference));
router.get("/tactics", asyncHandler(getTactics));
router.put("/tactics", asyncHandler(updateTactics));
router.post("/simulate", asyncHandler(simulateNextMatch));
router.get("/tournament", asyncHandler(getTournament));
router.get("/news", asyncHandler(getNews));

export default router;
