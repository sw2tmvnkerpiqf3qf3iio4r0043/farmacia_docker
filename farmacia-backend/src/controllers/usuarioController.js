const usuarioService = require('../services/usuarioService');

async function list(req, res, next) {
  try {
    res.json(await usuarioService.listUsuarios(req.query));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const usuario = await usuarioService.getUsuarioById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ error: 'NotFound', message: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await usuarioService.createUsuario(req.body));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const usuario = await usuarioService.updateUsuario(req.params.id, req.body);
    if (!usuario) {
      return res.status(404).json({ error: 'NotFound', message: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await usuarioService.deleteUsuario(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'NotFound', message: 'Usuario no encontrado' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };
