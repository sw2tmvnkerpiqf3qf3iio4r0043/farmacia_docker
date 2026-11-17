const { Router } = require('express');
const recetaController = require('../controllers/recetaController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { recetaValidators } = require('../validators');

const router = Router();

router.get('/vigentes', recetaController.listVigentes);
router.get('/cliente/:idCliente', recetaValidators.idCliente, validate, recetaController.getByCliente);
router.get('/', recetaController.list);
router.get('/:id', recetaValidators.id, validate, recetaController.getById);

router.post('/', authenticate, requireRole('regente'), recetaValidators.create, validate, recetaController.create);
router.put('/:id', authenticate, requireRole('regente'), recetaValidators.update, validate, recetaController.update);
router.patch('/:id/estado', authenticate, requireRole('regente'), recetaValidators.changeEstado, validate, recetaController.changeEstado);
router.delete('/:id', authenticate, requireRole('admin'), recetaValidators.id, validate, recetaController.remove);

module.exports = router;
