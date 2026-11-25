const db = require('../db/db.js');

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

async function listOfertas() {
  const query = 'SELECT * FROM oferta ORDER BY fecha_inicio DESC';
  const result = await db.query(query);
  return result.rows;
}

async function getOfertaById(id) {
  const query = 'SELECT * FROM oferta WHERE id_oferta = $1';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

async function createOferta(userId, data) {
  const activoBool = toBoolean(data.activo, false);
  const porcentaje = data.porcentajeDescuento !== undefined
    ? data.porcentajeDescuento
    : data.porcentaje_descuento;

  const queryText = `
    INSERT INTO oferta (nombre_oferta, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo, created_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *;
  `;
  const values = [
    data.nombreOferta || data.nombre_oferta,
    data.descripcion || null,
    porcentaje !== undefined ? Number(porcentaje) : 0,
    data.fechaInicio || data.fecha_inicio || new Date(),
    data.fechaFin || data.fecha_fin || null,
    activoBool,
    userId
  ];
  const result = await db.query(queryText, values);
  return result.rows[0];
}

async function updateOferta(userId, id, data) {
  const porcentaje = data.porcentajeDescuento !== undefined
    ? data.porcentajeDescuento
    : data.porcentaje_descuento;
  const values = [
    data.nombreOferta || data.nombre_oferta || null,
    data.descripcion !== undefined ? data.descripcion : null,
    porcentaje !== undefined ? Number(porcentaje) : null,
    data.fechaInicio || data.fecha_inicio || null,
    data.fechaFin || data.fecha_fin || null,
  ];
  const sets = [
    'nombre_oferta = COALESCE($1, nombre_oferta)',
    'descripcion = COALESCE($2, descripcion)',
    'porcentaje_descuento = COALESCE($3, porcentaje_descuento)',
    'fecha_inicio = COALESCE($4, fecha_inicio)',
    'fecha_fin = COALESCE($5, fecha_fin)',
  ];

  if (data.activo !== undefined && data.activo !== null) {
    values.push(toBoolean(data.activo));
    sets.push(`activo = $${values.length}`);
  }

  values.push(id);
  const queryText = `
    UPDATE oferta SET
      ${sets.join(',\n      ')},
      updated_at = NOW()
    WHERE id_oferta = $${values.length} RETURNING *;
  `;
  const result = await db.query(queryText, values);
  return result.rows[0];
}

async function deleteOferta(id) {
  const query = 'DELETE FROM oferta WHERE id_oferta = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

async function getOfertasActivas() {
  const query = `
    SELECT * FROM oferta 
    WHERE activo = true AND fecha_fin >= CURRENT_DATE
    ORDER BY fecha_inicio DESC
  `;
  const result = await db.query(query);
  return result.rows;
}

module.exports = {
  listOfertas, getOfertaById, createOferta, updateOferta, deleteOferta, getOfertasActivas
};
