const ubicacionService = require('../services/ubicacionService');

async function list(req, res, next) {
  try { res.json(await ubicacionService.listUbicaciones()); } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const ubicacion = await ubicacionService.getUbicacionById(req.params.id);
    if (!ubicacion) return res.status(404).json({ error: 'NotFound', message: 'Ubicación no encontrada' });
    res.json(ubicacion);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await ubicacionService.createUbicacion(req.body));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const ubicacion = await ubicacionService.updateUbicacion(req.params.id, req.body);
    if (!ubicacion) return res.status(404).json({ error: 'NotFound', message: 'Ubicación no encontrada' });
    res.json(ubicacion);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await ubicacionService.deleteUbicacion(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'NotFound', message: 'Ubicación no encontrada' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove };
