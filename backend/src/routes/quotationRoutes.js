const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/quotationController');
const { requireAuth } = require('../middleware/auth');
const { getOrCreateQuotationPdf } = require('../controllers/documentController');

router.use(requireAuth);
router.get('/', ctrl.list);
router.get('/sample-lookup', ctrl.sampleLookup);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/:id/status', ctrl.setStatus);
router.post('/:id/revise', ctrl.revise);
router.delete('/:id', ctrl.remove);

router.get('/:id/pdf', async (req, res) => {
  try {
    const result = await getOrCreateQuotationPdf(req.params.id, req);
    if (!result) return res.status(404).json({ error: 'Quotation not found' });

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
