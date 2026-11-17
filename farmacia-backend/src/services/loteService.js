const db = require('../db/db');

const ESTADOS_VALIDOS = ['activo', 'agotado', 'cuarentena', 'vencido', 'devuelto'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatLote(row) {
  if (!row) return null;
  return {
    idLote: row.id_lote,
    idMedicamento: row.id_medicamento,
    medicamento: row.medicamento_nombre,
    idProveedor: row.id_proveedor,
    proveedor: row.proveedor_nombre,
    numeroLote: row.numero_lote,
    fechaFabricacion: row.fecha_fabricacion,
    fechaVencimiento: row.fecha_vencimiento,
    cantidadInicial: row.cantidad_inicial,
    estado: row.estado,
    fechaIngreso: row.fecha_ingreso,
    observaciones: row.observaciones,
  };
}

const SELECT_LOTE = `
  SELECT l.*,
         m.nombre_comercial AS medicamento_nombre,
         p.nombre_empresa AS proveedor_nombre
    FROM lote_medicamento l
    JOIN medicamento m ON m.id_medicamento = l.id_medicamento
    LEFT JOIN proveedor p ON p.id_proveedor = l.id_proveedor
`;

function validarFechas(fechaFabricacion, fechaVencimiento) {
  const fab = new Date(fechaFabricacion);
  const ven = new Date(fechaVencimiento);
  if (isNaN(fab.getTime()) || isNaN(ven.getTime())) {
    throw httpError(400, 'Fechas de fabricación o vencimiento inválidas');
  }
  if (ven <= fab) {
    throw httpError(400, 'La fecha de vencimiento debe ser posterior a la fecha de fabricación');
  }
}

async function listLotes() {
  const result = await db.query(`${SELECT_LOTE} ORDER BY l.fecha_vencimiento ASC`);
  return result.rows.map(formatLote);
}

async function getLoteById(id) {
  const result = await db.query(`${SELECT_LOTE} WHERE l.id_lote = $1`, [id]);
  return formatLote(result.rows[0]);
}

async function getLotesByMedicamento(idMedicamento) {
  const result = await db.query(
    `${SELECT_LOTE} WHERE l.id_medicamento = $1 ORDER BY l.fecha_vencimiento ASC`,
    [idMedicamento]
  );
  return result.rows.map(formatLote);
}

async function getProximosVencer(dias = 30) {
  const result = await db.query(
    `${SELECT_LOTE}
      WHERE l.estado = 'activo'
        AND l.fecha_vencimiento >= CURRENT_DATE
        AND l.fecha_vencimiento <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
      ORDER BY l.fecha_vencimiento ASC`,
    [dias]
  );
  return result.rows.map(formatLote);
}

async function getLoteFefo(idMedicamento) {
  const result = await db.query(
    `${SELECT_LOTE}
      WHERE l.id_medicamento = $1
        AND l.estado = 'activo'
        AND l.fecha_vencimiento >= CURRENT_DATE
      ORDER BY l.fecha_vencimiento ASC
      LIMIT 1`,
    [idMedicamento]
  );
  return formatLote(result.rows[0]);
}

async function createLote(data) {
  validarFechas(data.fechaFabricacion, data.fechaVencimiento);

  const estado = data.estado || 'activo';
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw httpError(400, `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`);
  }

  const existe = await db.query(
    'SELECT 1 FROM lote_medicamento WHERE id_medicamento = $1 AND LOWER(numero_lote) = LOWER($2)',
    [data.idMedicamento, data.numeroLote]
  );
  if (existe.rows.length > 0) {
    throw httpError(409, 'Ya existe un lote con ese número para el medicamento');
  }

  const result = await db.query(
    `INSERT INTO lote_medicamento
       (id_medicamento, id_proveedor, numero_lote, fecha_fabricacion, fecha_vencimiento,
        cantidad_inicial, estado, observaciones)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id_lote`,
    [
      data.idMedicamento,
      data.idProveedor || data.id_proveedor || null,
      data.numeroLote,
      data.fechaFabricacion,
      data.fechaVencimiento,
      data.cantidadInicial,
      estado,
      data.observaciones || null,
    ]
  );
  return getLoteById(result.rows[0].id_lote);
}

async function updateLote(id, data) {
  const actual = await getLoteById(id);
  if (!actual) return null;

  const fechaFabricacion = data.fechaFabricacion || actual.fechaFabricacion;
  const fechaVencimiento = data.fechaVencimiento || actual.fechaVencimiento;
  validarFechas(fechaFabricacion, fechaVencimiento);

  if (data.estado !== undefined && !ESTADOS_VALIDOS.includes(data.estado)) {
    throw httpError(400, `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`);
  }

  const idMedicamento = data.idMedicamento !== undefined ? data.idMedicamento : actual.idMedicamento;
  const numeroLote = data.numeroLote !== undefined ? data.numeroLote : actual.numeroLote;

  const duplicado = await db.query(
    `SELECT 1 FROM lote_medicamento
      WHERE id_medicamento = $1 AND LOWER(numero_lote) = LOWER($2) AND id_lote <> $3`,
    [idMedicamento, numeroLote, id]
  );
  if (duplicado.rows.length > 0) {
    throw httpError(409, 'Ya existe un lote con ese número para el medicamento');
  }

  await db.query(
    `UPDATE lote_medicamento SET
       id_medicamento = $1,
       id_proveedor = $2,
       numero_lote = $3,
       fecha_fabricacion = $4,
       fecha_vencimiento = $5,
       cantidad_inicial = $6,
       estado = $7,
       observaciones = $8
     WHERE id_lote = $9`,
    [
      idMedicamento,
      data.idProveedor !== undefined ? data.idProveedor : actual.idProveedor,
      numeroLote,
      fechaFabricacion,
      fechaVencimiento,
      data.cantidadInicial !== undefined ? data.cantidadInicial : actual.cantidadInicial,
      data.estado !== undefined ? data.estado : actual.estado,
      data.observaciones !== undefined ? data.observaciones : actual.observaciones,
      id,
    ]
  );
  return getLoteById(id);
}

async function changeEstado(id, estado) {
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw httpError(400, `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`);
  }
  const result = await db.query(
    'UPDATE lote_medicamento SET estado = $1 WHERE id_lote = $2 RETURNING id_lote',
    [estado, id]
  );
  if (result.rows.length === 0) return null;
  return getLoteById(id);
}

async function deleteLote(id) {
  const result = await db.query(
    'DELETE FROM lote_medicamento WHERE id_lote = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  listLotes,
  getLoteById,
  getLotesByMedicamento,
  getProximosVencer,
  getLoteFefo,
  createLote,
  updateLote,
  changeEstado,
  deleteLote,
};
