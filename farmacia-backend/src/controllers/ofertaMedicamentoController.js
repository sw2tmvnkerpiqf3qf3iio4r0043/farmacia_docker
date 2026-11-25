const ofertaMedicamentoService = require('../services/ofertaMedicamentoService');

async function asignarMedicamento(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 1;
    const { idMedicamento } = req.body;
    
    if (!idMedicamento) {
      return res.status(400).json({ error: 'ValidationError', message: 'Debe enviar idMedicamento' });
    }
    
    const resultado = await ofertaMedicamentoService.asignarMedicamento(userId, req.params.id, idMedicamento);
    res.status(201).json(resultado);
  } catch (err) { 
    if (err.message.includes('ya está asignado')) {
      return res.status(409).json({ error: 'Conflict', message: err.message });
    }
    next(err); 
  }
}

async function eliminarRelacion(req, res, next) {
  try {
    const { idMedicamento } = req.params;
    const deleted = await ofertaMedicamentoService.eliminarRelacion(req.params.id, idMedicamento);
    
    if (!deleted) {
      return res.status(404).json({ error: 'NotFound', message: 'Relación no encontrada' });
    }
    res.status(204).send();
  } catch (err) { 
    next(err); 
  }
}

async function getMedicamentosDeOferta(req, res, next) {
  try {
    const medicamentos = await ofertaMedicamentoService.getMedicamentosDeOferta(req.params.id);
    res.json(medicamentos);
  } catch (err) { 
    next(err); 
  }
}

async function getOfertasActivasConProductos(req, res, next) {
  try {
    const ofertas = await ofertaMedicamentoService.getOfertasActivasConProductos();
    res.json(ofertas);
  } catch (err) { 
    next(err); 
  }
}

module.exports = { 
  asignarMedicamento, 
  eliminarRelacion, 
  getMedicamentosDeOferta,
  getOfertasActivasConProductos
};
