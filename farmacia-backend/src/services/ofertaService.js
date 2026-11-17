const db = require('../db/db.js');

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
  const activoBool = data.activo === true || data.activo === 1 || data.activo === '1';

  const queryText = `
    INSERT INTO oferta (nombre_oferta, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo, created_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *;
  `;
  const values = [
    data.nombreOferta || data.nombre_oferta,
    data.descripcion || null,
    Number(data.porcentajeDescuento || data.porcentaje_descuento),
    data.fechaInicio || data.fecha_inicio || new Date(),
    data.fechaFin || data.fecha_fin,
    activoBool,
    userId
  ];
  const result = await db.query(queryText, values);
  return result.rows[0];
}

async function updateOferta(userId, id, data) {
  const activoBool = data.activo !== undefined
    ? (data.activo === true || data.activo === 1 || data.activo === '1')
    : true;

  const queryText = `
    UPDATE oferta SET
      nombre_oferta = $1,
      descripcion = $2,
      porcentaje_descuento = $3,
      fecha_inicio = $4,
      fecha_fin = $5,
      activo = $6,
      updated_at = NOW()
    WHERE id_oferta = $7 RETURNING *;
  `;
  const values = [
    data.nombreOferta || data.nombre_oferta,
    data.descripcion,
    data.porcentajeDescuento || data.porcentaje_descuento,
    data.fechaInicio || data.fecha_inicio,
    data.fechaFin || data.fecha_fin,
    activoBool,
    id
  ];
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