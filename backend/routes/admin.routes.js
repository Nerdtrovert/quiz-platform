const express = require("express");
const router = express.Router();
const {
  getStats,
  getRooms,
  getRoomDetail,
  getSystemOverview,
  getSystemLiveRooms,
  getSystemStaticAttempts,
  removeLiveParticipant,
  endLiveRoom,
  deleteStaticAttempt,
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
router.get(
  "/system/static-attempts",
  verifyToken,
  requireMasterAdmin,
  getSystemStaticAttempts,
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
router.delete(
  "/system/static-attempts/:attemptId",
  verifyToken,
  requireMasterAdmin,
  deleteStaticAttempt,
);

module.exports = router;
