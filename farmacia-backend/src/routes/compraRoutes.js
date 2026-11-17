const { Router } = require('express');
const compraController = require('../controllers/compraController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { compraValidators } = require('../validators');

const router = Router();

router.get('/proveedor/:idProveedor', compraValidators.idProveedor, validate, compraController.getByProveedor);
router.get('/', compraController.list);
router.get('/:id', compraValidators.id, validate, compraController.getById);

router.post('/', authenticate, requireRole('admin', 'almacenero'), compraValidators.create, validate, compraController.create);
router.put('/:id', authenticate, requireRole('admin', 'almacenero'), compraValidators.update, validate, compraController.update);
router.patch('/:id/estado', authenticate, requireRole('admin', 'almacenero'), compraValidators.changeEstado, validate, compraController.changeEstado);
router.delete('/:id', authenticate, requireRole('admin'), compraValidators.id, validate, compraController.remove);

module.exports = router;
