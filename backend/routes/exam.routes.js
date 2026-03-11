const express = require("express");
const router = express.Router();
const {
  getQuizzes,
  getQuizById,
  createQuiz,
  deleteQuiz,
  getStaticQuizzes,
} = require("../controllers/exam.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Public
router.get("/static", getStaticQuizzes);
router.get("/:id", getQuizById);

// Admin only
router.get("/", verifyToken, getQuizzes);
router.post("/", verifyToken, createQuiz);
router.delete("/:id", verifyToken, deleteQuiz);

module.exports = router;