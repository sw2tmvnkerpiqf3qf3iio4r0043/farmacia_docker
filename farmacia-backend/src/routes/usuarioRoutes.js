const { Router } = require('express');
const usuarioController = require('../controllers/usuarioController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { usuarioValidators } = require('../validators');

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', usuarioController.list);
router.get('/:id', usuarioValidators.id, validate, usuarioController.getById);
router.post('/', usuarioValidators.create, validate, usuarioController.create);
router.put('/:id', usuarioValidators.update, validate, usuarioController.update);
router.delete('/:id', usuarioValidators.id, validate, usuarioController.remove);

module.exports = router;
