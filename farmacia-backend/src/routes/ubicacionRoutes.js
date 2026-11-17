const { Router } = require('express');
const ubicacionController = require('../controllers/ubicacionController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { ubicacionValidators } = require('../validators');

const router = Router();

router.get('/', ubicacionController.list);
router.get('/:id', ubicacionValidators.id, validate, ubicacionController.getById);

router.post('/', authenticate, requireRole('admin', 'almacenero'), ubicacionValidators.create, validate, ubicacionController.create);
router.put('/:id', authenticate, requireRole('admin', 'almacenero'), ubicacionValidators.update, validate, ubicacionController.update);
router.delete('/:id', authenticate, requireRole('admin'), ubicacionValidators.id, validate, ubicacionController.remove);

module.exports = router;
