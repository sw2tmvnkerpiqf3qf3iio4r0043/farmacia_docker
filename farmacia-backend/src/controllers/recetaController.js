const recetaService = require('../services/recetaService');

async function list(req, res, next) {
  try { res.json(await recetaService.listRecetas()); } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const receta = await recetaService.getRecetaById(req.params.id);
    if (!receta) return res.status(404).json({ error: 'NotFound', message: 'Receta no encontrada' });
    res.json(receta);
  } catch (err) { next(err); }
}

async function getByCliente(req, res, next) {
  try { res.json(await recetaService.getRecetasByCliente(req.params.idCliente)); } catch (err) { next(err); }
}

async function listVigentes(req, res, next) {
  try { res.json(await recetaService.getRecetasVigentes()); } catch (err) { next(err); }
}

async function create(req, res, next) {
  try { res.status(201).json(await recetaService.createReceta(req.body)); } catch (err) { next(err); }
}

async function createMia(req, res, next) {
  try {
    if (!req.user || !req.user.idCliente) {
      return res.status(403).json({ error: 'Forbidden', message: 'El usuario no está vinculado a un cliente' });
    }
    const receta = await recetaService.createReceta({ ...req.body, idCliente: req.user.idCliente });
    return res.status(201).json(receta);
  } catch (err) { next(err); }
}

async function listMias(req, res, next) {
  try {
    if (!req.user || !req.user.idCliente) {
      return res.status(403).json({ error: 'Forbidden', message: 'El usuario no está vinculado a un cliente' });
    }
    res.json(await recetaService.getRecetasByCliente(req.user.idCliente));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const receta = await recetaService.updateReceta(req.params.id, req.body);
    if (!receta) return res.status(404).json({ error: 'NotFound', message: 'Receta no encontrada' });
    res.json(receta);
  } catch (err) { next(err); }
}

async function changeEstado(req, res, next) {
  try {
    const receta = await recetaService.changeEstado(req.params.id, req.body.estado);
    if (!receta) return res.status(404).json({ error: 'NotFound', message: 'Receta no encontrada' });
    res.json(receta);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await recetaService.deleteReceta(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'NotFound', message: 'Receta no encontrada' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getById, getByCliente, listVigentes, create, createMia, listMias, update, changeEstado, remove };
