const alergiaService = require('../services/alergiaService');

async function list(req, res, next) {
  try { res.json(await alergiaService.listAlergias()); } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const alergia = await alergiaService.getAlergiaById(req.params.id);
    if (!alergia) return res.status(404).json({ error: 'NotFound', message: 'Alergia no encontrada' });
    res.json(alergia);
  } catch (err) { next(err); }
}

async function getByCliente(req, res, next) {
  try { res.json(await alergiaService.getAlergiasByCliente(req.params.idCliente)); } catch (err) { next(err); }
}

async function create(req, res, next) {
  try { res.status(201).json(await alergiaService.createAlergia(req.body)); } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const alergia = await alergiaService.updateAlergia(req.params.id, req.body);
    if (!alergia) return res.status(404).json({ error: 'NotFound', message: 'Alergia no encontrada' });
    res.json(alergia);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await alergiaService.deleteAlergia(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'NotFound', message: 'Alergia no encontrada' });
    res.status(204).send();
  } catch (err) { next(err); }
}

async function asignarCliente(req, res, next) {
  try { res.status(201).json(await alergiaService.addClienteAlergia(req.body)); } catch (err) { next(err); }
}

async function quitarCliente(req, res, next) {
  try {
    const removed = await alergiaService.removeClienteAlergia(req.params.idCliente, req.params.idAlergia);
    if (!removed) return res.status(404).json({ error: 'NotFound', message: 'El cliente no tiene registrada esa alergia' });
    res.status(204).send();
  } catch (err) { next(err); }
}

async function validar(req, res, next) {
  try {
    res.json(await alergiaService.validarAlergia(req.params.idCliente, req.params.idMedicamento));
  } catch (err) { next(err); }
}

module.exports = { list, getById, getByCliente, create, update, remove, asignarCliente, quitarCliente, validar };
