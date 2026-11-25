const { Router } = require('express');
const ventaController = require('../controllers/ventaController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { ventaValidators } = require('../validators');

const router = Router();

router.get('/metodos-pago', ventaController.getMetodosPago);
router.get('/mis-compras', authenticate, ventaController.getMisCompras);

router.get('/cliente/:idCliente', authenticate, ventaValidators.idCliente, validate, ventaController.getByCliente);
router.get('/:id/comprobante', authenticate, ventaValidators.id, validate, ventaController.getComprobante);
router.get('/', authenticate, requireRole('admin', 'regente', 'vendedor', 'almacenero'), ventaValidators.list, validate, ventaController.list);
router.get('/:id', authenticate, ventaValidators.id, validate, ventaController.getById);

router.post('/', authenticate, ventaValidators.create, validate, ventaController.create);
router.post('/:id/pagos', authenticate, requireRole('admin', 'regente', 'vendedor'), ventaValidators.addPago, validate, ventaController.addPago);
router.patch('/:id/pagos/:idPago/anular', authenticate, requireRole('admin', 'regente', 'vendedor'), ventaValidators.anularPago, validate, ventaController.anularPago);
router.patch('/:id/anular', authenticate, requireRole('admin', 'regente', 'vendedor'), ventaValidators.anular, validate, ventaController.anular);
router.patch('/:id/estado', authenticate, requireRole('admin', 'regente', 'vendedor'), ventaValidators.cambiarEstado, validate, ventaController.cambiarEstado);

module.exports = router;
