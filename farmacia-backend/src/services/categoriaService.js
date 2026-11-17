const db = require('../db/db');

async function listCategorias() {
  const result = await db.query(`
    SELECT 
      c.id_categoria,
      c.nombre,
      c.descripcion,
      c.tipo_categoria,
      c.tipo_enfermedad,
      c.id_categoria_padre,
      c.fecha_creacion,
      p.nombre AS nombre_categoria_padre
    FROM categoria c
    LEFT JOIN categoria p 
      ON p.id_categoria = c.id_categoria_padre
    ORDER BY c.id_categoria
  `);
  return result.rows;
}

async function getCategoriaById(id) {
  const result = await db.query(`
    SELECT 
      c.id_categoria,
      c.nombre,
      c.descripcion,
      c.tipo_categoria,
      c.tipo_enfermedad,
      c.id_categoria_padre,
      c.fecha_creacion,
      p.nombre AS nombre_categoria_padre
    FROM categoria c
    LEFT JOIN categoria p 
      ON p.id_categoria = c.id_categoria_padre
    WHERE c.id_categoria = $1
  `, [id]);
  return result.rows[0] || null;
}

async function createCategoria(userId, data) {
  const existe = await db.query(
    'SELECT id_categoria FROM categoria WHERE LOWER(nombre) = LOWER($1)',
    [data.nombre]
  );
  if (existe.rows.length > 0) {
    const err = new Error('Ya existe una categoría con ese nombre');
    err.status = 409;
    throw err;
  }

  const result = await db.query(`
    INSERT INTO categoria 
      (nombre, descripcion, tipo_categoria, tipo_enfermedad, id_categoria_padre)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id_categoria, nombre, descripcion, tipo_categoria, tipo_enfermedad, id_categoria_padre, fecha_creacion
  `, [
    data.nombre,
    data.descripcion || null,
    data.tipo_categoria || 'medicamento',
    data.tipo_enfermedad || 'general',
    data.id_categoria_padre || null
  ]);

  return result.rows[0];
}

async function updateCategoria(userId, id, data) {
  const current = await getCategoriaById(id);
  if (!current) return null;

  const parentId = data.id_categoria_padre !== undefined ? data.id_categoria_padre : current.id_categoria_padre;

  if (parentId && parentId === parseInt(id)) {
    const err = new Error('Una categoría no puede ser su propio padre');
    err.status = 400;
    throw err;
  }

  const result = await db.query(`
    UPDATE categoria 
    SET 
      nombre = COALESCE($1, nombre),
      descripcion = COALESCE($2, descripcion),
      tipo_categoria = COALESCE($3, tipo_categoria),
      tipo_enfermedad = COALESCE($4, tipo_enfermedad),
      id_categoria_padre = COALESCE($5, id_categoria_padre)
    WHERE id_categoria = $6
    RETURNING id_categoria, nombre, descripcion, tipo_categoria, tipo_enfermedad, id_categoria_padre, fecha_creacion
  `, [
    data.nombre,
    data.descripcion,
    data.tipo_categoria,
    data.tipo_enfermedad,
    parentId,
    id
  ]);

  return result.rows[0];
}

async function deleteCategoria(id) {
  const hijos = await db.query(
    'SELECT id_categoria FROM categoria WHERE id_categoria_padre = $1',
    [id]
  );
  if (hijos.rows.length > 0) {
    const err = new Error('No se puede eliminar: tiene subcategorías asignadas');
    err.status = 400;
    throw err;
  }

  const result = await db.query(
    'DELETE FROM categoria WHERE id_categoria = $1',
    [id]
  );
  return result.rowCount > 0;
}

module.exports = { listCategorias, getCategoriaById, createCategoria, updateCategoria, deleteCategoria };