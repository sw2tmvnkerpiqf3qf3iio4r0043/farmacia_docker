const bcrypt = require('bcryptjs');
const db = require('../db/db');
const { signToken } = require('../middleware/auth');

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
};

const USER_COLUMNS = `
  u.id_usuario,
  u.nombre_usuario,
  u.nombre,
  u.contrasena_hash,
  u.activo,
  u.id_cliente,
  u.fecha_creacion,
  (SELECT r.nombre
     FROM usuario_rol ur
     JOIN rol r ON r.id_rol = ur.id_rol
    WHERE ur.id_usuario = u.id_usuario
    ORDER BY ur.id_rol
    LIMIT 1) AS rol_nombre
`;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function mapRole(rolNombre) {
  if (!rolNombre) return 'user';
  return API_ROLE_BY_ROL[rolNombre] || rolNombre.toLowerCase();
}

function formatUser(row) {
  return {
    id: row.id_usuario,
    email: row.nombre_usuario,
    name: row.nombre || row.nombre_usuario,
    role: mapRole(row.rol_nombre),
    idCliente: row.id_cliente || null,
    createdAt: row.fecha_creacion,
  };
}

function tokenPayload(row) {
  return {
    id: row.id_usuario,
    email: row.nombre_usuario,
    role: mapRole(row.rol_nombre),
    idCliente: row.id_cliente || null,
  };
}

async function findByEmail(email) {
  const result = await db.query(
    `SELECT ${USER_COLUMNS}
       FROM usuario u
      WHERE LOWER(u.nombre_usuario) = LOWER($1)`,
    [email]
  );
  return result.rows[0] || null;
}

async function findById(userId) {
  const result = await db.query(
    `SELECT ${USER_COLUMNS}
       FROM usuario u
      WHERE u.id_usuario = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

function sanitizeEmail(email) {
  return String(email).trim().toLowerCase();
}

async function register({ email, password, name, role }) {
  const normalizedEmail = sanitizeEmail(email);

  const existing = await db.query(
    'SELECT 1 FROM usuario WHERE LOWER(nombre_usuario) = LOWER($1)',
    [normalizedEmail]
  );
  if (existing.rows.length > 0) {
    throw httpError(409, 'El email ya está registrado');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const inserted = await db.query(
    `INSERT INTO usuario (nombre_usuario, nombre, contrasena_hash, activo)
     VALUES ($1, $2, $3, TRUE)
     RETURNING id_usuario`,
    [normalizedEmail, name, passwordHash]
  );
  const userId = inserted.rows[0].id_usuario;

  const rolApi = (role || '').trim().toLowerCase();
  const rolNombre = ROL_BY_API_ROLE[rolApi];
  if (rolNombre) {
    const rol = await db.query(
      'SELECT id_rol FROM rol WHERE nombre = $1 AND activo',
      [rolNombre]
    );
    if (rol.rows.length > 0) {
      await db.query(
        'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, rol.rows[0].id_rol]
      );
    }
  }

  const row = await findById(userId);
  return { user: formatUser(row), token: signToken(tokenPayload(row)) };
}

async function login({ email, password }) {
  const user = await findByEmail(email);

  let passwordOk = false;
  try {
    passwordOk = !!(user && (await bcrypt.compare(password, user.contrasena_hash)));
  } catch {
    passwordOk = false;
  }

  if (!user || !user.activo || !passwordOk) {
    throw httpError(401, 'Email o contraseña incorrectos');
  }

  await db.query(
    'UPDATE usuario SET ultimo_acceso = NOW() WHERE id_usuario = $1',
    [user.id_usuario]
  );

  return { user: formatUser(user), token: signToken(tokenPayload(user)) };
}

async function getProfile(userId) {
  const row = await findById(userId);
  return row ? formatUser(row) : null;
}

async function updateProfile(userId, { name, email }) {
  const row = await findById(userId);
  if (!row) return null;

  const sets = [];
  const params = [];

  if (email) {
    const normalizedEmail = sanitizeEmail(email);
    if (normalizedEmail !== row.nombre_usuario.toLowerCase()) {
      const duplicated = await db.query(
        'SELECT 1 FROM usuario WHERE LOWER(nombre_usuario) = LOWER($1) AND id_usuario <> $2',
        [normalizedEmail, userId]
      );
      if (duplicated.rows.length > 0) {
        throw httpError(409, 'El email ya está en uso');
      }
      params.push(normalizedEmail);
      sets.push(`nombre_usuario = $${params.length}`);
    }
  }

  if (name !== undefined) {
    params.push(name);
    sets.push(`nombre = $${params.length}`);
  }

  if (sets.length > 0) {
    params.push(userId);
    await db.query(`UPDATE usuario SET ${sets.join(', ')} WHERE id_usuario = $${params.length}`, params);
  }

  return getProfile(userId);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const row = await findById(userId);
  if (!row) {
    throw httpError(401, 'Contraseña actual incorrecta');
  }

  let passwordOk = false;
  try {
    passwordOk = await bcrypt.compare(currentPassword, row.contrasena_hash);
  } catch {
    passwordOk = false;
  }

  if (!passwordOk) {
    throw httpError(401, 'Contraseña actual incorrecta');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.query(
    'UPDATE usuario SET contrasena_hash = $1 WHERE id_usuario = $2',
    [passwordHash, userId]
  );
  return true;
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
};