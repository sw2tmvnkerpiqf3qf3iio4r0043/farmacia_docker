const db = require('../db/db');

const GRAVEDADES_VALIDAS = ['leve', 'moderada', 'grave'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatAlergia(row) {
  if (!row) return null;
  return {
    idAlergia: row.id_alergia,
    nombre: row.nombre,
    descripcion: row.descripcion,
    activo: row.activo,
  };
}

function formatClienteAlergia(row) {
  return {
    idCliente: row.id_cliente,
    idAlergia: row.id_alergia,
    alergia: row.alergia_nombre,
    descripcion: row.alergia_descripcion,
    gravedad: row.gravedad,
    observacion: row.observacion,
    fechaRegistro: row.fecha_registro,
  };
}

async function listAlergias() {
  const result = await db.query('SELECT * FROM alergia ORDER BY nombre');
  return result.rows.map(formatAlergia);
}

async function getAlergiaById(id) {
  const result = await db.query('SELECT * FROM alergia WHERE id_alergia = $1', [id]);
  return formatAlergia(result.rows[0]);
}

async function getAlergiasByCliente(idCliente) {
  const result = await db.query(
    `SELECT ca.id_cliente,
            ca.id_alergia,
            a.nombre AS alergia_nombre,
            a.descripcion AS alergia_descripcion,
            ca.gravedad,
            ca.observacion,
            ca.fecha_registro
       FROM cliente_alergia ca
       JOIN alergia a ON a.id_alergia = ca.id_alergia
      WHERE ca.id_cliente = $1
      ORDER BY a.nombre`,
    [idCliente]
  );
  return result.rows.map(formatClienteAlergia);
}

async function createAlergia(data) {
  const existe = await db.query(
    'SELECT 1 FROM alergia WHERE LOWER(nombre) = LOWER($1)',
    [data.nombre]
  );
  if (existe.rows.length > 0) {
    throw httpError(409, 'Ya existe una alergia con ese nombre');
  }

  const result = await db.query(
    `INSERT INTO alergia (nombre, descripcion, activo)
     VALUES ($1, $2, $3)
     RETURNING id_alergia`,
    [
      data.nombre,
      data.descripcion || null,
      data.activo !== undefined ? Boolean(data.activo) : true,
    ]
  );
  return getAlergiaById(result.rows[0].id_alergia);
}

async function updateAlergia(id, data) {
  const actual = await getAlergiaById(id);
  if (!actual) return null;

  const nombre = data.nombre !== undefined ? data.nombre : actual.nombre;
  const duplicado = await db.query(
    'SELECT 1 FROM alergia WHERE LOWER(nombre) = LOWER($1) AND id_alergia <> $2',
    [nombre, id]
  );
  if (duplicado.rows.length > 0) {
    throw httpError(409, 'Ya existe una alergia con ese nombre');
  }

  await db.query(
    `UPDATE alergia SET
       nombre = $1,
       descripcion = $2,
       activo = $3
     WHERE id_alergia = $4`,
    [
      nombre,
      data.descripcion !== undefined ? data.descripcion : actual.descripcion,
      data.activo !== undefined ? Boolean(data.activo) : actual.activo,
      id,
    ]
  );
  return getAlergiaById(id);
}

async function deleteAlergia(id) {
  const result = await db.query('DELETE FROM alergia WHERE id_alergia = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

async function addClienteAlergia(data) {
  const cliente = await db.query('SELECT 1 FROM cliente WHERE id_cliente = $1', [data.idCliente]);
  if (cliente.rows.length === 0) {
    throw httpError(400, 'El cliente indicado no existe');
  }
  const alergia = await db.query('SELECT 1 FROM alergia WHERE id_alergia = $1', [data.idAlergia]);
  if (alergia.rows.length === 0) {
    throw httpError(400, 'La alergia indicada no existe');
  }

  const gravedad = data.gravedad || 'moderada';
  if (!GRAVEDADES_VALIDAS.includes(gravedad)) {
    throw httpError(400, `Gravedad inválida. Valores permitidos: ${GRAVEDADES_VALIDAS.join(', ')}`);
  }

  const existe = await db.query(
    'SELECT 1 FROM cliente_alergia WHERE id_cliente = $1 AND id_alergia = $2',
    [data.idCliente, data.idAlergia]
  );
  if (existe.rows.length > 0) {
    throw httpError(409, 'El cliente ya tiene registrada esa alergia');
  }

  const result = await db.query(
    `INSERT INTO cliente_alergia (id_cliente, id_alergia, gravedad, observacion)
     VALUES ($1, $2, $3, $4)
     RETURNING id_cliente, id_alergia, gravedad, observacion, fecha_registro`,
    [data.idCliente, data.idAlergia, gravedad, data.observacion || null]
  );

  const alergiaInfo = await db.query('SELECT nombre, descripcion FROM alergia WHERE id_alergia = $1', [data.idAlergia]);
  return {
    idCliente: result.rows[0].id_cliente,
    idAlergia: result.rows[0].id_alergia,
    alergia: alergiaInfo.rows[0].nombre,
    descripcion: alergiaInfo.rows[0].descripcion,
    gravedad: result.rows[0].gravedad,
    observacion: result.rows[0].observacion,
    fechaRegistro: result.rows[0].fecha_registro,
  };
}

async function removeClienteAlergia(idCliente, idAlergia) {
  const result = await db.query(
    'DELETE FROM cliente_alergia WHERE id_cliente = $1 AND id_alergia = $2',
    [idCliente, idAlergia]
  );
  return result.rowCount > 0;
}

async function validarAlergia(idCliente, idMedicamento) {
  const result = await db.query(
    `SELECT a.id_alergia,
            a.nombre,
            a.descripcion,
            ca.gravedad,
            ca.observacion
       FROM cliente_alergia ca
       JOIN alergia a ON a.id_alergia = ca.id_alergia
       JOIN alergia_principio_activo apa ON apa.id_alergia = a.id_alergia
       JOIN medicamento_principio_activo mpa ON mpa.id_principio_activo = apa.id_principio_activo
      WHERE ca.id_cliente = $1
        AND mpa.id_medicamento = $2`,
    [idCliente, idMedicamento]
  );

  const alergias = result.rows.map((row) => ({
    idAlergia: row.id_alergia,
    nombre: row.nombre,
    descripcion: row.descripcion,
    gravedad: row.gravedad,
    observacion: row.observacion,
  }));

  return {
    idCliente: Number(idCliente),
    idMedicamento: Number(idMedicamento),
    tieneAlergia: alergias.length > 0,
    alergias,
  };
}

module.exports = {
  listAlergias,
  getAlergiaById,
  getAlergiasByCliente,
  createAlergia,
  updateAlergia,
  deleteAlergia,
  addClienteAlergia,
  removeClienteAlergia,
  validarAlergia,
};
