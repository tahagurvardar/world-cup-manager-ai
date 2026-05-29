import { Router } from "express";
import { matchReport, tacticalAdvice } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(protect);
router.post("/advice", asyncHandler(tacticalAdvice));
router.post("/match-report", asyncHandler(matchReport));

export default router;
