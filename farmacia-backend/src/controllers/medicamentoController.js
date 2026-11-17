const medicamentoService = require('../services/medicamentoService');

async function list(req, res, next) {
  try {
    const medicamentos = await medicamentoService.listMedicamentos();
    res.json(medicamentos);
  } catch (err) { 
    next(err); 
  }
}

async function getById(req, res, next) {
  try {
    const medicamento = await medicamentoService.getMedicamentoById(req.params.id);
    if (!medicamento) return res.status(404).json({ error: 'NotFound', message: 'Medicamento no encontrado' });
    res.json(medicamento);
  } catch (err) { 
    next(err); 
  }
}

async function create(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 1;
    const medicamento = await medicamentoService.createMedicamento(userId, req.body);
    res.status(201).json(medicamento);
  } catch (err) { 
    next(err); 
  }
}

async function update(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 1;
    const medicamento = await medicamentoService.updateMedicamento(userId, req.params.id, req.body);
    if (!medicamento) return res.status(404).json({ error: 'NotFound', message: 'Medicamento no encontrado' });
    res.json(medicamento);
  } catch (err) { 
    next(err); 
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await medicamentoService.deleteMedicamento(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'NotFound', message: 'Medicamento no encontrado' });
    res.status(204).send();
  } catch (err) { 
    next(err); 
  }
}

// 🆕 Funciones avanzadas
async function buscarPorNombre(req, res, next) {
  try {
    const { nombre } = req.query; // ✅ CORRECTO: Extrae el valor de la URL ?nombre=...
    if (!nombre) return res.status(400).json({ error: 'ValidationError', message: 'Debe enviar ?nombre=' });
    
    const resultados = await medicamentoService.buscarPorNombre(nombre);
    res.json(resultados);
  } catch (err) { 
    next(err); 
  }
}

async function getStockCritico(req, res, next) {
  try {
    const medicamentos = await medicamentoService.getStockCritico();
    res.json(medicamentos);
  } catch (err) { 
    next(err); 
  }
}

async function getSinStock(req, res, next) {
  try {
    const medicamentos = await medicamentoService.getSinStock();
    res.json(medicamentos);
  } catch (err) { 
    next(err); 
  }
}

async function actualizarStock(req, res, next) {
  try {
    const { id } = req.params;
    const { cantidad, operacion } = req.body;
    
    if (!cantidad || !operacion) {
      return res.status(400).json({ error: 'ValidationError', message: 'Debe enviar cantidad y operacion (sumar/restar)' });
    }
    
    const medicamento = await medicamentoService.actualizarStockIncremental(id, cantidad, operacion);
    if (!medicamento) return res.status(404).json({ error: 'NotFound', message: 'Medicamento no encontrado' });
    
    res.json(medicamento);
  } catch (err) { 
    next(err); 
  }
}

async function getMedicamentosConOferta(req, res, next) {
  try {
    const medicamentos = await medicamentoService.getMedicamentosConOferta();
    res.json(medicamentos);
  } catch (err) { 
    next(err); 
  }
}

async function getEstadisticas(req, res, next) {
  try {
    const stats = await medicamentoService.getEstadisticas();
    res.json(stats);
  } catch (err) { 
    next(err); 
  }
}

async function asignarOferta(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 1;
    const asignacion = await medicamentoService.asignarOfertaAMedicamento(userId, req.body);
    res.status(201).json(asignacion);
  } catch (err) { 
    next(err); 
  }
}

module.exports = {
  list, 
  getById, 
  create, 
  update, 
  remove,
  buscarPorNombre, 
  getStockCritico, 
  getSinStock,
  actualizarStock, 
  getMedicamentosConOferta, 
  getEstadisticas, 
  asignarOferta
};