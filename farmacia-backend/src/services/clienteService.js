const db = require('../db/db');

const SELECT_CLIENTE = `
  SELECT c.id_cliente,
         c.id_persona,
         p.ci,
         p.nombre_completo,
         p.telefono,
         p.email,
         c.fecha_nacimiento,
         c.condiciones_cronicas,
         c.es_local,
         c.activo
    FROM cliente c
    JOIN persona p ON p.id_persona = c.id_persona
`;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatCliente(row) {
  if (!row) return null;
  return {
    idCliente: row.id_cliente,
    idPersona: row.id_persona,
    ci: row.ci,
    nombre: row.nombre_completo,
    telefono: row.telefono,
    email: row.email,
    fechaNacimiento: row.fecha_nacimiento,
    condicionesCronicas: row.condiciones_cronicas,
    esLocal: Boolean(row.es_local),
    activo: Boolean(row.activo),
  };
}

function toBoolean(value) {
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  return Boolean(value);
}

function fechaISO(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10) || null;
}

function emailNormalizado(email) {
  const value = String(email || '').trim().toLowerCase();
  return value || null;
}

async function listClientes(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.activo === 'true' || filters.activo === true) {
    conditions.push('c.activo = TRUE');
  } else if (filters.activo === 'false' || filters.activo === false) {
    conditions.push('c.activo = FALSE');
  }
  if (filters.buscar) {
    values.push(`%${String(filters.buscar).trim()}%`);
    conditions.push(`(p.nombre_completo ILIKE $${values.length} OR p.ci ILIKE $${values.length} OR p.email ILIKE $${values.length})`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `${SELECT_CLIENTE} ${where} ORDER BY p.nombre_completo ASC`,
    values
  );
  return result.rows.map(formatCliente);
}

async function getClienteById(id) {
  const result = await db.query(`${SELECT_CLIENTE} WHERE c.id_cliente = $1`, [id]);
  return formatCliente(result.rows[0]);
}

async function validarDuplicados(client, { ci, email }, idPersonaActual = null) {
  if (ci) {
    const duplicadoCi = await client.query(
      `SELECT 1 FROM persona WHERE LOWER(ci) = LOWER($1)
        ${idPersonaActual ? 'AND id_persona <> $2' : ''}`,
      idPersonaActual ? [ci, idPersonaActual] : [ci]
    );
    if (duplicadoCi.rows.length > 0) {
      throw httpError(409, 'Ya existe una persona registrada con ese CI');
    }
  }

  if (email) {
    const duplicadoEmail = await client.query(
      `SELECT 1 FROM persona WHERE LOWER(email) = LOWER($1)
        ${idPersonaActual ? 'AND id_persona <> $2' : ''}`,
      idPersonaActual ? [email, idPersonaActual] : [email]
    );
    if (duplicadoEmail.rows.length > 0) {
      throw httpError(409, 'Ya existe una persona registrada con ese email');
    }
  }
}

async function createCliente(data) {
  const ci = String(data.ci || '').trim();
  const nombre = String(data.nombre || '').trim();
  const telefono = String(data.telefono || '').trim();
  const email = emailNormalizado(data.email);

  if (!ci || !nombre || !telefono) {
    throw httpError(400, 'El CI, el nombre y el teléfono son obligatorios');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await validarDuplicados(client, { ci, email });

    const persona = await client.query(
      `INSERT INTO persona (ci, nombre_completo, telefono, email)
       VALUES ($1, $2, $3, $4)
       RETURNING id_persona`,
      [ci, nombre, telefono, email]
    );

    const cliente = await client.query(
      `INSERT INTO cliente
         (id_persona, fecha_nacimiento, condiciones_cronicas, es_local, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_cliente`,
      [
        persona.rows[0].id_persona,
        fechaISO(data.fechaNacimiento),
        data.condicionesCronicas ? String(data.condicionesCronicas).trim() : null,
        data.esLocal !== undefined ? Boolean(data.esLocal) : true,
        data.activo !== undefined ? Boolean(data.activo) : true,
      ]
    );

    await client.query('COMMIT');
    return getClienteById(cliente.rows[0].id_cliente);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateCliente(id, data) {
  const actual = await getClienteById(id);
  if (!actual) return null;

  const ci = data.ci !== undefined ? String(data.ci).trim() : actual.ci;
  const nombre = data.nombre !== undefined ? String(data.nombre).trim() : actual.nombre;
  const telefono = data.telefono !== undefined ? String(data.telefono).trim() : actual.telefono;
  const email = data.email !== undefined ? emailNormalizado(data.email) : actual.email;

  if (!ci || !nombre || !telefono) {
    throw httpError(400, 'El CI, el nombre y el teléfono son obligatorios');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await validarDuplicados(client, { ci, email }, actual.idPersona);

    await client.query(
      `UPDATE persona
          SET ci = $1,
              nombre_completo = $2,
              telefono = $3,
              email = $4
        WHERE id_persona = $5`,
      [ci, nombre, telefono, email, actual.idPersona]
    );

    await client.query(
      `UPDATE cliente
          SET fecha_nacimiento = $1,
              condiciones_cronicas = $2,
              es_local = $3,
              activo = $4
        WHERE id_cliente = $5`,
      [
        data.fechaNacimiento !== undefined ? fechaISO(data.fechaNacimiento) : fechaISO(actual.fechaNacimiento),
        data.condicionesCronicas !== undefined
          ? (data.condicionesCronicas ? String(data.condicionesCronicas).trim() : null)
          : actual.condicionesCronicas,
        data.esLocal !== undefined ? Boolean(data.esLocal) : actual.esLocal,
        data.activo !== undefined ? Boolean(data.activo) : actual.activo,
        id,
      ]
    );

    await client.query('COMMIT');
    return getClienteById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteCliente(id) {
  const result = await db.query(
    'UPDATE cliente SET activo = FALSE WHERE id_cliente = $1 RETURNING id_cliente',
    [id]
  );
  return result.rows[0] || null;
}

function formatMiCliente(cliente) {
  if (!cliente) return null;
  return {
    idCliente: cliente.idCliente,
    ci: cliente.ci,
    nombreCompleto: cliente.nombre,
    telefono: cliente.telefono,
    email: cliente.email,
    fechaNacimiento: cliente.fechaNacimiento,
    condicionesCronicas: cliente.condicionesCronicas,
    esLocal: cliente.esLocal,
    activo: cliente.activo,
  };
}

async function getMiCliente(idCliente) {
  return formatMiCliente(await getClienteById(idCliente));
}

async function updateMiCliente(idCliente, data) {
  const payload = {
    ci: data.ci,
    nombre: data.nombreCompleto !== undefined ? data.nombreCompleto : data.nombre,
    telefono: data.telefono,
    email: data.email,
    fechaNacimiento: data.fechaNacimiento,
    condicionesCronicas: data.condicionesCronicas,
    esLocal: data.esLocal !== undefined ? toBoolean(data.esLocal) : undefined,
  };
  return formatMiCliente(await updateCliente(idCliente, payload));
}

module.exports = {
  listClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
  getMiCliente,
  updateMiCliente,
};
