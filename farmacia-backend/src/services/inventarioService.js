const db = require('../db/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatInventario(row) {
  if (!row) return null;
  return {
    idInventario: row.id_inventario,
    idLote: row.id_lote,
    numeroLote: row.numero_lote,
    idMedicamento: row.id_medicamento,
    medicamento: row.medicamento_nombre,
    idUbicacion: row.id_ubicacion,
    ubicacion: row.ubicacion_nombre,
    cantidadActual: row.cantidad_actual,
    stockMinimo: row.stock_minimo,
    stockMaximo: row.stock_maximo,
    fechaActualizacion: row.fecha_actualizacion,
  };
}

const SELECT_INVENTARIO = `
  SELECT i.*,
         l.numero_lote,
         l.id_medicamento,
         m.nombre_comercial AS medicamento_nombre,
         u.nombre AS ubicacion_nombre
    FROM inventario i
    JOIN lote_medicamento l ON l.id_lote = i.id_lote
    JOIN medicamento m ON m.id_medicamento = l.id_medicamento
    JOIN ubicacion_inventario u ON u.id_ubicacion = i.id_ubicacion
`;

async function listInventario() {
  const result = await db.query(`${SELECT_INVENTARIO} ORDER BY i.id_inventario`);
  return result.rows.map(formatInventario);
}

async function getInventarioById(id) {
  const result = await db.query(`${SELECT_INVENTARIO} WHERE i.id_inventario = $1`, [id]);
  return formatInventario(result.rows[0]);
}

async function getInventarioByLote(idLote) {
  const result = await db.query(`${SELECT_INVENTARIO} WHERE i.id_lote = $1 ORDER BY i.id_inventario`, [idLote]);
  return result.rows.map(formatInventario);
}

async function getInventarioByUbicacion(idUbicacion) {
  const result = await db.query(`${SELECT_INVENTARIO} WHERE i.id_ubicacion = $1 ORDER BY i.id_inventario`, [idUbicacion]);
  return result.rows.map(formatInventario);
}

async function getStockCritico() {
  const result = await db.query(
    `${SELECT_INVENTARIO} WHERE i.cantidad_actual <= i.stock_minimo ORDER BY (i.stock_minimo - i.cantidad_actual) DESC`
  );
  return result.rows.map(formatInventario);
}

async function createInventario(data) {
  const existe = await db.query(
    'SELECT 1 FROM inventario WHERE id_lote = $1 AND id_ubicacion = $2',
    [data.idLote, data.idUbicacion]
  );
  if (existe.rows.length > 0) {
    throw httpError(409, 'Ya existe inventario para ese lote en esa ubicación');
  }

  const result = await db.query(
    `INSERT INTO inventario (id_lote, id_ubicacion, cantidad_actual, stock_minimo, stock_maximo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_inventario`,
    [
      data.idLote,
      data.idUbicacion,
      data.cantidadActual !== undefined ? data.cantidadActual : 0,
      data.stockMinimo !== undefined ? data.stockMinimo : 0,
      data.stockMaximo !== undefined && data.stockMaximo !== null ? data.stockMaximo : null,
    ]
  );
  return getInventarioById(result.rows[0].id_inventario);
}

async function updateInventario(id, data) {
  const actual = await getInventarioById(id);
  if (!actual) return null;

  await db.query(
    `UPDATE inventario SET
       id_lote = $1,
       id_ubicacion = $2,
       cantidad_actual = $3,
       stock_minimo = $4,
       stock_maximo = $5,
       fecha_actualizacion = NOW()
     WHERE id_inventario = $6`,
    [
      data.idLote !== undefined ? data.idLote : actual.idLote,
      data.idUbicacion !== undefined ? data.idUbicacion : actual.idUbicacion,
      data.cantidadActual !== undefined ? data.cantidadActual : actual.cantidadActual,
      data.stockMinimo !== undefined ? data.stockMinimo : actual.stockMinimo,
      data.stockMaximo !== undefined ? data.stockMaximo : actual.stockMaximo,
      id,
    ]
  );
  return getInventarioById(id);
}

async function deleteInventario(id) {
  const result = await db.query('DELETE FROM inventario WHERE id_inventario = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = {
  listInventario,
  getInventarioById,
  getInventarioByLote,
  getInventarioByUbicacion,
  getStockCritico,
  createInventario,
  updateInventario,
  deleteInventario,
};
