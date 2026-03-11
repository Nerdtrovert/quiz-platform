const express = require('express');
const router = express.Router();
const { getResult, getLeaderboard } = require('../controllers/score.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/result/:attemptId', verifyToken, getResult);
router.get('/leaderboard/:examId', verifyToken, getLeaderboard);

module.exports = router;
