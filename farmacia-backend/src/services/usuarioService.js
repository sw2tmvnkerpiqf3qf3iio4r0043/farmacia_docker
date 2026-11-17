const bcrypt = require('bcryptjs');
const db = require('../db/db');

const BCRYPT_ROUNDS = 12;

const API_ROLE_BY_ROL = {
  Administrador: 'admin',
  Regente: 'regente',
  Vendedor: 'vendedor',
  Almacenero: 'almacenero',
};

const ROL_BY_API_ROLE = {
  admin: 'Administrador',
  administrador: 'Administrador',
  regente: 'Regente',
  vendedor: 'Vendedor',
  almacenero: 'Almacenero',
  Administrador: 'Administrador',
  Regente: 'Regente',
  Vendedor: 'Vendedor',
  Almacenero: 'Almacenero',
};

const SELECT_USUARIO = `
  SELECT u.id_usuario,
         u.nombre_usuario,
         u.nombre,
         u.activo,
         u.id_cliente,
         u.fecha_creacion,
         u.ultimo_acceso,
         p.nombre_completo AS cliente_nombre,
         (SELECT r.nombre
            FROM usuario_rol ur
            JOIN rol r ON r.id_rol = ur.id_rol
           WHERE ur.id_usuario = u.id_usuario
           ORDER BY ur.id_rol
           LIMIT 1) AS rol_nombre
    FROM usuario u
    LEFT JOIN cliente c ON c.id_cliente = u.id_cliente
    LEFT JOIN persona p ON p.id_persona = c.id_persona
`;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatUsuario(row) {
  if (!row) return null;
  return {
    id: row.id_usuario,
    email: row.nombre_usuario,
    name: row.nombre || row.nombre_usuario,
    role: API_ROLE_BY_ROL[row.rol_nombre] || 'user',
    roleName: row.rol_nombre || null,
    idCliente: row.id_cliente || null,
    cliente: row.cliente_nombre || null,
    activo: Boolean(row.activo),
    createdAt: row.fecha_creacion,
    lastAccess: row.ultimo_acceso,
  };
}

function normalizarRol(role) {
  if (!role) return null;
  return ROL_BY_API_ROLE[String(role).trim()] || null;
}

async function obtenerRolId(nombre, client = db) {
  const result = await client.query(
    'SELECT id_rol FROM rol WHERE nombre = $1 AND activo',
    [nombre]
  );
  if (!result.rows[0]) {
    throw httpError(400, `El rol ${nombre} no existe o está inactivo`);
  }
  return result.rows[0].id_rol;
}

async function listUsuarios(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.activo === 'true' || filters.activo === true) {
    conditions.push('u.activo = TRUE');
  } else if (filters.activo === 'false' || filters.activo === false) {
    conditions.push('u.activo = FALSE');
  }
  if (filters.buscar) {
    values.push(`%${String(filters.buscar).trim()}%`);
    conditions.push(`(u.nombre_usuario ILIKE $${values.length} OR u.nombre ILIKE $${values.length})`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `${SELECT_USUARIO} ${where} ORDER BY u.fecha_creacion DESC`,
    values
  );
  return result.rows.map(formatUsuario);
}

async function getUsuarioById(id) {
  const result = await db.query(`${SELECT_USUARIO} WHERE u.id_usuario = $1`, [id]);
  return formatUsuario(result.rows[0]);
}

async function validarEmail(email, idExcluir = null) {
  const values = [email];
  let sql = 'SELECT 1 FROM usuario WHERE LOWER(nombre_usuario) = LOWER($1)';
  if (idExcluir) {
    values.push(idExcluir);
    sql += ' AND id_usuario <> $2';
  }
  const result = await db.query(sql, values);
  if (result.rows.length > 0) {
    throw httpError(409, 'El email ya está registrado');
  }
}

async function validarCliente(opcionalId, client = db) {
  if (opcionalId === undefined || opcionalId === null || opcionalId === '') return null;
  const idCliente = Number(opcionalId);
  const result = await client.query(
    'SELECT 1 FROM cliente WHERE id_cliente = $1',
    [idCliente]
  );
  if (result.rows.length === 0) {
    throw httpError(400, 'El cliente asociado no existe');
  }
  return idCliente;
}

async function createUsuario(data) {
  const email = String(data.email || '').trim().toLowerCase();
  const name = String(data.name || '').trim();
  const password = String(data.password || '');
  const rolNombre = normalizarRol(data.role) || 'Vendedor';
  const activo = data.activo !== undefined ? Boolean(data.activo) : true;

  if (!email || !name || password.length < 6) {
    throw httpError(400, 'El email, el nombre y una contraseña de al menos 6 caracteres son obligatorios');
  }

  await validarEmail(email);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const idRol = await obtenerRolId(rolNombre, client);
    const idCliente = await validarCliente(data.idCliente, client);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const insert = await client.query(
      `INSERT INTO usuario
         (nombre_usuario, nombre, contrasena_hash, activo, id_cliente)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_usuario`,
      [email, name, passwordHash, activo, idCliente]
    );

    await client.query(
      'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2)',
      [insert.rows[0].id_usuario, idRol]
    );

    await client.query('COMMIT');
    return getUsuarioById(insert.rows[0].id_usuario);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateUsuario(id, data) {
  const actual = await getUsuarioById(id);
  if (!actual) return null;

  if (data.email !== undefined) {
    const email = String(data.email).trim().toLowerCase();
    if (!email) throw httpError(400, 'El email no puede estar vacío');
    if (email !== actual.email.toLowerCase()) {
      await validarEmail(email, id);
    }
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const sets = [];
    const values = [];

    if (data.email !== undefined) {
      values.push(String(data.email).trim().toLowerCase());
      sets.push(`nombre_usuario = $${values.length}`);
    }
    if (data.name !== undefined) {
      values.push(String(data.name).trim());
      sets.push(`nombre = $${values.length}`);
    }
    if (data.password) {
      if (String(data.password).length < 6) {
        throw httpError(400, 'La contraseña debe tener al menos 6 caracteres');
      }
      values.push(await bcrypt.hash(String(data.password), BCRYPT_ROUNDS));
      sets.push(`contrasena_hash = $${values.length}`);
    }
    if (data.activo !== undefined) {
      values.push(Boolean(data.activo));
      sets.push(`activo = $${values.length}`);
    }
    if (data.idCliente !== undefined) {
      values.push(await validarCliente(data.idCliente, client));
      sets.push(`id_cliente = $${values.length}`);
    }

    if (sets.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE usuario SET ${sets.join(', ')} WHERE id_usuario = $${values.length}`,
        values
      );
    }

    if (data.role !== undefined) {
      const rolNombre = normalizarRol(data.role);
      if (!rolNombre) {
        throw httpError(400, 'El rol indicado es inválido');
      }
      const idRol = await obtenerRolId(rolNombre, client);
      await client.query('DELETE FROM usuario_rol WHERE id_usuario = $1', [id]);
      await client.query(
        'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2)',
        [id, idRol]
      );
    }

    await client.query('COMMIT');
    return getUsuarioById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteUsuario(id) {
  const result = await db.query(
    'UPDATE usuario SET activo = FALSE WHERE id_usuario = $1 RETURNING id_usuario',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  listUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
};
