const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { exportQuotations, exportPurchaseOrders } = require('../controllers/reportsController');

router.use(requireAuth, requireRole('admin'));
router.get('/quotations', exportQuotations);
router.get('/purchase-orders', exportPurchaseOrders);

module.exports = router;
