const { Router } = require('express');
const ofertaController = require('../controllers/ofertaController');
const ofertaMedicamentoController = require('../controllers/ofertaMedicamentoController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { ofertaValidators } = require('../validators');

const router = Router();

router.get('/', ofertaController.list);
router.get('/activas', ofertaController.getActivas);
router.get('/activas-con-productos', ofertaMedicamentoController.getOfertasActivasConProductos);
router.get('/:id', ofertaValidators.id, validate, ofertaController.getById);

router.post('/', authenticate, requireRole('admin', 'regente'), ofertaValidators.create, validate, ofertaController.create);
router.put('/:id', authenticate, requireRole('admin', 'regente'), ofertaValidators.update, validate, ofertaController.update);
router.delete('/:id', authenticate, requireRole('admin', 'regente'), ofertaValidators.id, validate, ofertaController.remove);

module.exports = router;