const express = require("express");
const router = express.Router();
const {
  getStats,
  getRooms,
  getRoomDetail,
  getSystemOverview,
  getActiveLiveRooms,
  getStaticAttemptStats,
  deleteStaticAttempt,
  removeLiveParticipant,
  endLiveRoom,
} = require("../controllers/admin.controller");
const { verifyToken, requireMasterAdmin } = require("../middleware/auth.middleware");

router.get("/stats", verifyToken, getStats);
router.get("/rooms", verifyToken, getRooms);
router.get("/rooms/:room_id", verifyToken, getRoomDetail);

router.get("/system/overview", verifyToken, requireMasterAdmin, getSystemOverview);
router.get("/system/live-rooms", verifyToken, requireMasterAdmin, getActiveLiveRooms);
router.get("/system/static-attempts", verifyToken, requireMasterAdmin, getStaticAttemptStats);
router.delete(
  "/system/static-attempts/:attempt_id",
  verifyToken,
  requireMasterAdmin,
  deleteStaticAttempt,
);
router.delete(
  "/system/live-rooms/:room_code/participants/:participant_id",
  verifyToken,
  requireMasterAdmin,
  removeLiveParticipant,
);
router.post(
  "/system/live-rooms/:room_code/end",
  verifyToken,
  requireMasterAdmin,
  endLiveRoom,
);

module.exports = router;
