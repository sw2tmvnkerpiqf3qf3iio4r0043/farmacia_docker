const { Router } = require('express');
const clienteController = require('../controllers/clienteController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { clienteValidators } = require('../validators');

const router = Router();

router.use(authenticate);

router.get('/', requireRole('admin', 'regente', 'vendedor'), clienteController.list);
router.get('/mi', clienteController.getMi);
router.put('/mi', clienteValidators.mi, validate, clienteController.updateMi);
router.get('/:id', requireRole('admin', 'regente', 'vendedor'), clienteValidators.id, validate, clienteController.getById);

router.post('/', requireRole('admin', 'regente', 'vendedor'), clienteValidators.create, validate, clienteController.create);
router.put('/:id', requireRole('admin', 'regente', 'vendedor'), clienteValidators.update, validate, clienteController.update);
router.delete('/:id', requireRole('admin'), clienteValidators.id, validate, clienteController.remove);

module.exports = router;
