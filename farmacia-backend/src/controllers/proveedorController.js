const proveedorService = require('../services/proveedorService');

async function list(req, res, next) {
  try { res.json(await proveedorService.listProveedores()); } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const proveedor = await proveedorService.getProveedorById(req.params.id);
    if (!proveedor) return res.status(404).json({ error: 'NotFound', message: 'Proveedor no encontrado' });
    res.json(proveedor);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try { res.status(201).json(await proveedorService.createProveedor(req.body)); } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const proveedor = await proveedorService.updateProveedor(req.params.id, req.body);
    if (!proveedor) return res.status(404).json({ error: 'NotFound', message: 'Proveedor no encontrado' });
    res.json(proveedor);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await proveedorService.deleteProveedor(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'NotFound', message: 'Proveedor no encontrado' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove };
