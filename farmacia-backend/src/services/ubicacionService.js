const db = require('../db/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatUbicacion(row) {
  if (!row) return null;
  return {
    idUbicacion: row.id_ubicacion,
    idSucursal: row.id_sucursal,
    sucursal: row.sucursal_nombre,
    nombre: row.nombre,
    pasillo: row.pasillo,
    estante: row.estante,
    temperaturaRecomendada: row.temperatura_recomendada,
    activa: row.activa,
    fechaCreacion: row.fecha_creacion,
  };
}

const SELECT_UBICACION = `
  SELECT u.*, s.nombre AS sucursal_nombre
    FROM ubicacion_inventario u
    JOIN sucursal s ON s.id_sucursal = u.id_sucursal
`;

async function listUbicaciones() {
  const result = await db.query(`${SELECT_UBICACION} ORDER BY u.id_sucursal, u.nombre`);
  return result.rows.map(formatUbicacion);
}

async function getUbicacionById(id) {
  const result = await db.query(`${SELECT_UBICACION} WHERE u.id_ubicacion = $1`, [id]);
  return formatUbicacion(result.rows[0]);
}

async function createUbicacion(data) {
  const existe = await db.query(
    'SELECT 1 FROM ubicacion_inventario WHERE id_sucursal = $1 AND LOWER(nombre) = LOWER($2)',
    [data.idSucursal, data.nombre]
  );
  if (existe.rows.length > 0) {
    throw httpError(409, 'Ya existe una ubicación con ese nombre en la sucursal');
  }

  const result = await db.query(
    `INSERT INTO ubicacion_inventario
       (id_sucursal, nombre, pasillo, estante, temperatura_recomendada, activa)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.idSucursal,
      data.nombre,
      data.pasillo || null,
      data.estante || null,
      data.temperaturaRecomendada || data.temperatura_recomendada || null,
      data.activa !== undefined ? Boolean(data.activa) : true,
    ]
  );
  return getUbicacionById(result.rows[0].id_ubicacion);
}

async function updateUbicacion(id, data) {
  const actual = await getUbicacionById(id);
  if (!actual) return null;

  const idSucursal = data.idSucursal !== undefined ? data.idSucursal : actual.idSucursal;
  const nombre = data.nombre !== undefined ? data.nombre : actual.nombre;

  const duplicado = await db.query(
    `SELECT 1 FROM ubicacion_inventario
      WHERE id_sucursal = $1 AND LOWER(nombre) = LOWER($2) AND id_ubicacion <> $3`,
    [idSucursal, nombre, id]
  );
  if (duplicado.rows.length > 0) {
    throw httpError(409, 'Ya existe una ubicación con ese nombre en la sucursal');
  }

  const result = await db.query(
    `UPDATE ubicacion_inventario SET
       id_sucursal = $1,
       nombre = $2,
       pasillo = $3,
       estante = $4,
       temperatura_recomendada = $5,
       activa = $6
     WHERE id_ubicacion = $7
     RETURNING *`,
    [
      idSucursal,
      nombre,
      data.pasillo !== undefined ? data.pasillo : actual.pasillo,
      data.estante !== undefined ? data.estante : actual.estante,
      data.temperaturaRecomendada !== undefined
        ? data.temperaturaRecomendada
        : actual.temperaturaRecomendada,
      data.activa !== undefined ? Boolean(data.activa) : actual.activa,
      id,
    ]
  );
  return getUbicacionById(result.rows[0].id_ubicacion);
}

async function deleteUbicacion(id) {
  const result = await db.query(
    'DELETE FROM ubicacion_inventario WHERE id_ubicacion = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  listUbicaciones,
  getUbicacionById,
  createUbicacion,
  updateUbicacion,
  deleteUbicacion,
};
