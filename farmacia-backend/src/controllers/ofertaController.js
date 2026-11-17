const ofertaService = require('../services/ofertaService');

async function list(req, res, next) {
  try { res.json(await ofertaService.listOfertas()); } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const oferta = await ofertaService.getOfertaById(req.params.id);
    if (!oferta) return res.status(404).json({ error: 'NotFound', message: 'Oferta no encontrada' });
    res.json(oferta);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 1;
    res.status(201).json(await ofertaService.createOferta(userId, req.body));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 1;
    const oferta = await ofertaService.updateOferta(userId, req.params.id, req.body);
    if (!oferta) return res.status(404).json({ error: 'NotFound', message: 'Oferta no encontrada' });
    res.json(oferta);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await ofertaService.deleteOferta(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'NotFound', message: 'Oferta no encontrada' });
    res.status(204).send();
  } catch (err) { next(err); }
}

async function getActivas(req, res, next) {
  try { res.json(await ofertaService.getOfertasActivas()); } catch (err) { next(err); }
}

module.exports = { 
  list, 
  getById, 
  create, 
  update, 
  remove, 
  getActivas
 };