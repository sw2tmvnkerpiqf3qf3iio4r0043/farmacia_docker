const { Router } = require('express');
const inventarioController = require('../controllers/inventarioController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { inventarioValidators } = require('../validators');

const router = Router();

router.get('/stock-critico', inventarioController.getStockCritico);
router.get('/lote/:idLote', inventarioValidators.idLote, validate, inventarioController.getByLote);
router.get('/ubicacion/:idUbicacion', inventarioValidators.idUbicacion, validate, inventarioController.getByUbicacion);
router.get('/', inventarioController.list);
router.get('/:id', inventarioValidators.id, validate, inventarioController.getById);

router.post('/', authenticate, requireRole('admin', 'almacenero'), inventarioValidators.create, validate, inventarioController.create);
router.put('/:id', authenticate, requireRole('admin', 'almacenero'), inventarioValidators.update, validate, inventarioController.update);
router.delete('/:id', authenticate, requireRole('admin'), inventarioValidators.id, validate, inventarioController.remove);

module.exports = router;
