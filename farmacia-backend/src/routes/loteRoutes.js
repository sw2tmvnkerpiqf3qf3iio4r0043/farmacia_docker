const { Router } = require('express');
const loteController = require('../controllers/loteController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { loteValidators } = require('../validators');

const router = Router();

router.get('/proximos-vencer', loteController.getProximosVencer);
router.get('/medicamento/:idMedicamento', loteValidators.idMedicamento, validate, loteController.getByMedicamento);
router.get('/', loteController.list);
router.get('/:id', loteValidators.id, validate, loteController.getById);

router.post('/', authenticate, requireRole('admin', 'almacenero'), loteValidators.create, validate, loteController.create);
router.put('/:id', authenticate, requireRole('admin', 'almacenero'), loteValidators.update, validate, loteController.update);
router.patch('/:id/estado', authenticate, requireRole('admin', 'almacenero'), loteValidators.changeEstado, validate, loteController.changeEstado);
router.delete('/:id', authenticate, requireRole('admin'), loteValidators.id, validate, loteController.remove);

module.exports = router;
