const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/itemController');
const importCtrl = require('../controllers/importController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(requireAuth);
router.get('/', ctrl.list);
router.get('/import/template', importCtrl.itemTemplate);
router.post('/import', upload.single('file'), importCtrl.importItems);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
