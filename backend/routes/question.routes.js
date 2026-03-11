const express = require("express");
const router = express.Router();
const {
  getQuestions,
  addQuestion,
  deleteQuestion,
} = require("../controllers/question.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.get("/", verifyToken, getQuestions);
router.post("/", verifyToken, addQuestion);
router.delete("/:id", verifyToken, deleteQuestion);

module.exports = router;
