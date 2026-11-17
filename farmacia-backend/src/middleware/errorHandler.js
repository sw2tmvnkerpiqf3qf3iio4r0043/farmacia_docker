const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Datos de entrada inválidos',
      details: errors.array(),
    });
  }
  next();
}

function errorHandler(err, req, res, _next) {
  console.error(err);

  const pgErrors = {
    '23505': { status: 409, error: 'Conflict', message: 'El recurso ya existe' },
    '23503': { status: 409, error: 'Conflict', message: 'Operación no permitida: existen registros relacionados' },
    '23502': { status: 400, error: 'ValidationError', message: 'Faltan datos obligatorios' },
    '23514': { status: 400, error: 'ValidationError', message: 'Los datos no cumplen una restricción de la base de datos' },
    '22P02': { status: 400, error: 'ValidationError', message: 'Formato de dato inválido' },
    P0001: { status: 400, error: 'BusinessRuleError', message: 'La operación no cumple una regla de negocio' },
  };

  if (err.code && pgErrors[err.code]) {
    const mapped = pgErrors[err.code];
    return res.status(mapped.status).json({
      error: mapped.error,
      message: err.code === 'P0001' ? err.message : mapped.message,
      detail: err.detail,
    });
  }

  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Error interno del servidor',
  });
}

function notFound(req, res) {
  res.status(404).json({
    error: 'NotFound',
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
  });
}

module.exports = { validate, errorHandler, notFound };
