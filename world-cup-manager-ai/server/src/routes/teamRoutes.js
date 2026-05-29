import { Router } from "express";
import { getTeamByCode, getTeams } from "../controllers/teamController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getTeams));
router.get("/:code", asyncHandler(getTeamByCode));

export default router;
