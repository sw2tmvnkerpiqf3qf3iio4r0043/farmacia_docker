const compraService = require('../services/compraService');

async function list(req, res, next) {
  try { res.json(await compraService.listCompras()); } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const compra = await compraService.getCompraById(req.params.id);
    if (!compra) return res.status(404).json({ error: 'NotFound', message: 'Compra no encontrada' });
    res.json(compra);
  } catch (err) { next(err); }
}

async function getByProveedor(req, res, next) {
  try { res.json(await compraService.getComprasByProveedor(req.params.idProveedor)); } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    res.status(201).json(await compraService.createCompra(userId, req.body));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const compra = await compraService.updateCompra(req.params.id, req.body);
    if (!compra) return res.status(404).json({ error: 'NotFound', message: 'Compra no encontrada' });
    res.json(compra);
  } catch (err) { next(err); }
}

async function changeEstado(req, res, next) {
  try {
    const compra = await compraService.changeEstado(req.params.id, req.body.estado, req.body.idUbicacion);
    if (!compra) return res.status(404).json({ error: 'NotFound', message: 'Compra no encontrada' });
    res.json(compra);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await compraService.deleteCompra(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'NotFound', message: 'Compra no encontrada' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getById, getByProveedor, create, update, changeEstado, remove };
