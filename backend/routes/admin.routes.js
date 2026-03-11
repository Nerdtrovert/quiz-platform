const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/admin.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');

router.get('/dashboard', verifyToken, isAdmin, getDashboard);

module.exports = router;
