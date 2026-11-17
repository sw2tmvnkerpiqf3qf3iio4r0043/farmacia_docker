const loteService = require('../services/loteService');

async function list(req, res, next) {
  try { res.json(await loteService.listLotes()); } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const lote = await loteService.getLoteById(req.params.id);
    if (!lote) return res.status(404).json({ error: 'NotFound', message: 'Lote no encontrado' });
    res.json(lote);
  } catch (err) { next(err); }
}

async function getByMedicamento(req, res, next) {
  try {
    res.json(await loteService.getLotesByMedicamento(req.params.idMedicamento));
  } catch (err) { next(err); }
}

async function getProximosVencer(req, res, next) {
  try {
    const dias = req.query.dias ? Number(req.query.dias) : 30;
    res.json(await loteService.getProximosVencer(dias));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await loteService.createLote(req.body));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const lote = await loteService.updateLote(req.params.id, req.body);
    if (!lote) return res.status(404).json({ error: 'NotFound', message: 'Lote no encontrado' });
    res.json(lote);
  } catch (err) { next(err); }
}

async function changeEstado(req, res, next) {
  try {
    const lote = await loteService.changeEstado(req.params.id, req.body.estado);
    if (!lote) return res.status(404).json({ error: 'NotFound', message: 'Lote no encontrado' });
    res.json(lote);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await loteService.deleteLote(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'NotFound', message: 'Lote no encontrado' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  list,
  getById,
  getByMedicamento,
  getProximosVencer,
  create,
  update,
  changeEstado,
  remove,
};
