const { Router } = require('express');
const proveedorController = require('../controllers/proveedorController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { proveedorValidators } = require('../validators');

const router = Router();

router.get('/', proveedorController.list);
router.get('/:id', proveedorValidators.id, validate, proveedorController.getById);

router.post('/', authenticate, requireRole('admin', 'almacenero'), proveedorValidators.create, validate, proveedorController.create);
router.put('/:id', authenticate, requireRole('admin', 'almacenero'), proveedorValidators.update, validate, proveedorController.update);
router.delete('/:id', authenticate, requireRole('admin'), proveedorValidators.id, validate, proveedorController.remove);

module.exports = router;
