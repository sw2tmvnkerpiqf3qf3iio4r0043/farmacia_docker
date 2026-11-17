const { Router } = require('express');
const medicamentoController = require('../controllers/medicamentoController');
const { authenticate } = require('../middleware/auth'); 
const { validate } = require('../middleware/errorHandler');
const { medicamentoValidators } = require('../validators');

const router = Router();

router.get('/estadisticas', medicamentoController.getEstadisticas);
router.get('/stock-critico', medicamentoController.getStockCritico);
router.get('/sin-stock', medicamentoController.getSinStock);
router.get('/buscar', medicamentoController.buscarPorNombre);
router.get('/con-oferta', medicamentoController.getMedicamentosConOferta);

router.get('/', medicamentoController.list);
router.post('/', authenticate, medicamentoValidators.create, validate, medicamentoController.create);  

router.get('/:id', medicamentoValidators.id, validate, medicamentoController.getById);
router.put('/:id', authenticate, medicamentoValidators.update, validate, medicamentoController.update);
router.delete('/:id', authenticate, medicamentoValidators.id, validate, medicamentoController.remove);

router.patch('/:id/stock', authenticate, medicamentoValidators.actualizarStock, validate, medicamentoController.actualizarStock);

router.post('/:id/oferta', authenticate, medicamentoValidators.asignarOferta, validate, medicamentoController.asignarOferta);

module.exports = router;