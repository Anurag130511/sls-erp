const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listDocuments, downloadDocument } = require('../controllers/documentController');

router.use(requireAuth);
router.get('/', listDocuments);
router.get('/:id/download', downloadDocument);

module.exports = router;
