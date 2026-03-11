const express = require("express");
const router = express.Router();
const {
  submitAttempt,
  getLeaderboard,
} = require("../controllers/attempt.controller");

router.post("/", submitAttempt);
router.get("/leaderboard/:quiz_id", getLeaderboard);

module.exports = router;
