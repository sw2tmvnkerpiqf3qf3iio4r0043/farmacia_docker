const { Router } = require('express');
const alergiaController = require('../controllers/alergiaController');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { alergiaValidators } = require('../validators');

const router = Router();

router.get('/validar/:idCliente/:idMedicamento', alergiaValidators.validar, validate, alergiaController.validar);
router.get('/cliente/:idCliente', alergiaValidators.idCliente, validate, alergiaController.getByCliente);
router.get('/', alergiaController.list);
router.get('/:id', alergiaValidators.id, validate, alergiaController.getById);

router.post('/cliente', authenticate, requireRole('regente'), alergiaValidators.asignar, validate, alergiaController.asignarCliente);
router.delete('/cliente/:idCliente/:idAlergia', authenticate, requireRole('regente'), alergiaValidators.quitar, validate, alergiaController.quitarCliente);

router.post('/', authenticate, requireRole('admin', 'regente'), alergiaValidators.create, validate, alergiaController.create);
router.put('/:id', authenticate, requireRole('admin', 'regente'), alergiaValidators.update, validate, alergiaController.update);
router.delete('/:id', authenticate, requireRole('admin'), alergiaValidators.id, validate, alergiaController.remove);

module.exports = router;
