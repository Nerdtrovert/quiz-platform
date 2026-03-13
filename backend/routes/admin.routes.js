const express = require("express");
const router = express.Router();
const {
  getStats,
  getRooms,
  getRoomDetail,
} = require("../controllers/admin.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.get("/stats", verifyToken, getStats);
router.get("/rooms", verifyToken, getRooms);
router.get("/rooms/:room_id", verifyToken, getRoomDetail);

module.exports = router;
