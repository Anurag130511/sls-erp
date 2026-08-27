const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/purchaseOrderController');
const { requireAuth } = require('../middleware/auth');
const { getOrCreatePurchaseOrderPdf } = require('../controllers/documentController');

router.use(requireAuth);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/:id/status', ctrl.setStatus);
router.post('/:id/receive', ctrl.receiveItems);
router.delete('/:id', ctrl.remove);

router.get('/:id/pdf', async (req, res) => {
  try {
    const result = await getOrCreatePurchaseOrderPdf(req.params.id);
    if (!result) return res.status(404).json({ error: 'Purchase order not found' });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${result.filename}"`,
    });
    res.send(result.buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
