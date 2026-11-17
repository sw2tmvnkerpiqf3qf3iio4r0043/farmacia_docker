const { Router } = require('express');
const categoriaController = require('../controllers/categoriaController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { categoriaValidators } = require('../validators');

const router = Router();

// Rutas PÚBLICAS (Listado y consulta)
router.get('/', categoriaController.list);
router.get('/:id', categoriaController.getById);

// Rutas CRUD (Solo admin o regente)
router.post('/', authenticate, requireRole('admin', 'regente'), categoriaValidators.create, validate, categoriaController.create);
router.put('/:id', authenticate, requireRole('admin', 'regente'), categoriaValidators.update, validate, categoriaController.update);
router.delete('/:id', authenticate, requireRole('admin', 'regente'), categoriaValidators.id, validate, categoriaController.remove);

module.exports = router;