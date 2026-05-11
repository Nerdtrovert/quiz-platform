const express = require("express");
const router = express.Router();
const { submitAttempt } = require("../controllers/attempt.controller");

router.post("/", submitAttempt);

module.exports = router;
