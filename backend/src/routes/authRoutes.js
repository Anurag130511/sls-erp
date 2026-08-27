const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// Only login lives here. Account creation is admin-only and lives at
// POST /api/users (see routes/userRoutes.js) — keeping a single path for
// creating accounts avoids confusion, and admin-gating it matters once
// this app is reachable from other computers on the network.
router.post('/login', login);

module.exports = router;
