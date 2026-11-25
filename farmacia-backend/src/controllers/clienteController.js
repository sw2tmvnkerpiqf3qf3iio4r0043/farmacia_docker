const clienteService = require('../services/clienteService');

async function list(req, res, next) {
  try {
    res.json(await clienteService.listClientes(req.query));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const cliente = await clienteService.getClienteById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'NotFound', message: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (err) {
    next(err);
  }
}

function idClienteFromToken(req) {
  return req.user ? req.user.idCliente : null;
}

async function getMi(req, res, next) {
  try {
    const idCliente = idClienteFromToken(req);
    if (!idCliente) {
      return res.status(404).json({ error: 'NotFound', message: 'El usuario no está vinculado a un cliente' });
    }
    const cliente = await clienteService.getMiCliente(idCliente);
    if (!cliente) {
      return res.status(404).json({ error: 'NotFound', message: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (err) {
    next(err);
  }
}

async function updateMi(req, res, next) {
  try {
    const idCliente = idClienteFromToken(req);
    if (!idCliente) {
      return res.status(404).json({ error: 'NotFound', message: 'El usuario no está vinculado a un cliente' });
    }
    const cliente = await clienteService.updateMiCliente(idCliente, req.body);
    if (!cliente) {
      return res.status(404).json({ error: 'NotFound', message: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await clienteService.createCliente(req.body));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const cliente = await clienteService.updateCliente(req.params.id, req.body);
    if (!cliente) {
      return res.status(404).json({ error: 'NotFound', message: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await clienteService.deleteCliente(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'NotFound', message: 'Cliente no encontrado' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, getMi, updateMi, create, update, remove };
