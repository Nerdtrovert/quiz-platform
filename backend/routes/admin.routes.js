const express = require("express");
const router = express.Router();
const {
  getStats,
  getRooms,
  getRoomDetail,
  getSystemOverview,
  getSystemLiveRooms,
  removeLiveParticipant,
  endLiveRoom,
  getStaticQuizById,
  createStaticQuiz,
  updateStaticQuiz,
  deleteStaticQuiz,
} = require("../controllers/admin.controller");
const {
  verifyToken,
  requireMasterAdmin,
} = require("../middleware/auth.middleware");

router.get("/stats", verifyToken, getStats);
router.get("/rooms", verifyToken, getRooms);
router.get("/rooms/:room_id", verifyToken, getRoomDetail);
router.get(
  "/system/overview",
  verifyToken,
  requireMasterAdmin,
  getSystemOverview,
);
router.get(
  "/system/live-rooms",
  verifyToken,
  requireMasterAdmin,
  getSystemLiveRooms,
);
router.delete(
  "/system/live-rooms/:roomCode/participants/:participantId",
  verifyToken,
  requireMasterAdmin,
  removeLiveParticipant,
);
router.post(
  "/system/live-rooms/:roomCode/end",
  verifyToken,
  requireMasterAdmin,
  endLiveRoom,
);

// Static Quiz Management Routes
router.get(
  "/system/static-quizzes/:quizId",
  verifyToken,
  requireMasterAdmin,
  getStaticQuizById,
);
router.post(
  "/system/static-quizzes",
  verifyToken,
  requireMasterAdmin,
  createStaticQuiz,
);
router.put(
  "/system/static-quizzes/:quizId",
  verifyToken,
  requireMasterAdmin,
  updateStaticQuiz,
);
router.delete(
  "/system/static-quizzes/:quizId",
  verifyToken,
  requireMasterAdmin,
  deleteStaticQuiz,
);

module.exports = router;
