const { Router } = require('express');
const ofertaMedicamentoController = require('../controllers/ofertaMedicamentoController');
const { validate } = require('../middleware/errorHandler');
const { ofertaMedicamentoValidators } = require('../validators');

const router = Router();

router.get('/:id/medicamentos', 
  ofertaMedicamentoValidators.id, 
  validate, 
  ofertaMedicamentoController.getMedicamentosDeOferta
);

router.post('/:id/medicamentos', 
  ofertaMedicamentoValidators.asignar, 
  validate, 
  ofertaMedicamentoController.asignarMedicamento
);

router.delete('/:id/medicamentos/:idMedicamento', 
  ofertaMedicamentoValidators.eliminar, 
  validate, 
  ofertaMedicamentoController.eliminarRelacion
);

module.exports = router;