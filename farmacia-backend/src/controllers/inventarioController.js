const inventarioService = require('../services/inventarioService');

async function list(req, res, next) {
  try { res.json(await inventarioService.listInventario()); } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const inventario = await inventarioService.getInventarioById(req.params.id);
    if (!inventario) return res.status(404).json({ error: 'NotFound', message: 'Registro de inventario no encontrado' });
    res.json(inventario);
  } catch (err) { next(err); }
}

async function getByLote(req, res, next) {
  try { res.json(await inventarioService.getInventarioByLote(req.params.idLote)); } catch (err) { next(err); }
}

async function getByUbicacion(req, res, next) {
  try { res.json(await inventarioService.getInventarioByUbicacion(req.params.idUbicacion)); } catch (err) { next(err); }
}

async function getStockCritico(req, res, next) {
  try { res.json(await inventarioService.getStockCritico()); } catch (err) { next(err); }
}

async function create(req, res, next) {
  try { res.status(201).json(await inventarioService.createInventario(req.body)); } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const inventario = await inventarioService.updateInventario(req.params.id, req.body);
    if (!inventario) return res.status(404).json({ error: 'NotFound', message: 'Registro de inventario no encontrado' });
    res.json(inventario);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await inventarioService.deleteInventario(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'NotFound', message: 'Registro de inventario no encontrado' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getById, getByLote, getByUbicacion, getStockCritico, create, update, remove };
