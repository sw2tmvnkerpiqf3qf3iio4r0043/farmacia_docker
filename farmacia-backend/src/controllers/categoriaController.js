const categoriaService = require('../services/categoriaService');

async function list(req, res, next) {
  try {
    const categorias = await categoriaService.listCategorias();
    res.json(categorias);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const categoria = await categoriaService.getCategoriaById(req.params.id);
    if (!categoria) return res.status(404).json({ error: 'NotFound', message: 'Categoría no encontrada' });
    res.json(categoria);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 1;
    const categoria = await categoriaService.createCategoria(userId, req.body);
    res.status(201).json(categoria);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 1;
    const categoria = await categoriaService.updateCategoria(userId, req.params.id, req.body);
    if (!categoria) return res.status(404).json({ error: 'NotFound', message: 'Categoría no encontrada' });
    res.json(categoria);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await categoriaService.deleteCategoria(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'NotFound', message: 'Categoría no encontrada' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove
};