const db = require('../db/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatProveedor(row) {
  if (!row) return null;
  return {
    idProveedor: row.id_proveedor,
    nombreEmpresa: row.nombre_empresa,
    contactoNombre: row.contacto_nombre,
    contactoTelefono: row.contacto_telefono,
    contactoEmail: row.contacto_email,
    aceptaDevoluciones: row.acepta_devoluciones,
    frecuenciaVisita: row.frecuencia_visita,
    fechaRegistro: row.fecha_registro,
    activo: row.activo,
  };
}

async function listProveedores() {
  const result = await db.query('SELECT * FROM proveedor ORDER BY nombre_empresa');
  return result.rows.map(formatProveedor);
}

async function getProveedorById(id) {
  const result = await db.query('SELECT * FROM proveedor WHERE id_proveedor = $1', [id]);
  return formatProveedor(result.rows[0]);
}

async function createProveedor(data) {
  const existe = await db.query(
    'SELECT 1 FROM proveedor WHERE LOWER(nombre_empresa) = LOWER($1)',
    [data.nombreEmpresa]
  );
  if (existe.rows.length > 0) {
    throw httpError(409, 'Ya existe un proveedor con ese nombre de empresa');
  }

  const result = await db.query(
    `INSERT INTO proveedor
       (nombre_empresa, contacto_nombre, contacto_telefono, contacto_email,
        acepta_devoluciones, frecuencia_visita, activo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_proveedor`,
    [
      data.nombreEmpresa,
      data.contactoNombre,
      data.contactoTelefono,
      data.contactoEmail || null,
      data.aceptaDevoluciones !== undefined ? Boolean(data.aceptaDevoluciones) : true,
      data.frecuenciaVisita || 'semanal',
      data.activo !== undefined ? Boolean(data.activo) : true,
    ]
  );
  return getProveedorById(result.rows[0].id_proveedor);
}

async function updateProveedor(id, data) {
  const actual = await getProveedorById(id);
  if (!actual) return null;

  const nombreEmpresa = data.nombreEmpresa !== undefined ? data.nombreEmpresa : actual.nombreEmpresa;
  const duplicado = await db.query(
    'SELECT 1 FROM proveedor WHERE LOWER(nombre_empresa) = LOWER($1) AND id_proveedor <> $2',
    [nombreEmpresa, id]
  );
  if (duplicado.rows.length > 0) {
    throw httpError(409, 'Ya existe un proveedor con ese nombre de empresa');
  }

  await db.query(
    `UPDATE proveedor SET
       nombre_empresa = $1,
       contacto_nombre = $2,
       contacto_telefono = $3,
       contacto_email = $4,
       acepta_devoluciones = $5,
       frecuencia_visita = $6,
       activo = $7
     WHERE id_proveedor = $8`,
    [
      nombreEmpresa,
      data.contactoNombre !== undefined ? data.contactoNombre : actual.contactoNombre,
      data.contactoTelefono !== undefined ? data.contactoTelefono : actual.contactoTelefono,
      data.contactoEmail !== undefined ? data.contactoEmail : actual.contactoEmail,
      data.aceptaDevoluciones !== undefined ? Boolean(data.aceptaDevoluciones) : actual.aceptaDevoluciones,
      data.frecuenciaVisita !== undefined ? data.frecuenciaVisita : actual.frecuenciaVisita,
      data.activo !== undefined ? Boolean(data.activo) : actual.activo,
      id,
    ]
  );
  return getProveedorById(id);
}

async function deleteProveedor(id) {
  const result = await db.query('DELETE FROM proveedor WHERE id_proveedor = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = {
  listProveedores,
  getProveedorById,
  createProveedor,
  updateProveedor,
  deleteProveedor,
};
