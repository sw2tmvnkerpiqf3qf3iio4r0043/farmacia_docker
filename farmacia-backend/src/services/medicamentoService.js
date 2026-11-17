const db = require('../db/db.js');

const IMAGEN_DEFAULT = 'https://cdn-icons-png.flaticon.com/512/3004/3004458.png';

const STOCK_EXPRESSION = `
  COALESCE((
    SELECT SUM(i.cantidad_actual)
      FROM inventario i
      JOIN lote_medicamento l ON l.id_lote = i.id_lote
     WHERE l.id_medicamento = m.id_medicamento
  ), 0)::integer
`;

const SELECT_MEDICAMENTO = `
  SELECT m.id_medicamento,
         m.codigo_barras,
         m.nombre_comercial,
         m.nombre_generico,
         m.descripcion,
         m.id_categoria,
         m.tipo_producto,
         m.presentacion,
         m.precio_compra,
         m.precio_venta,
         ${STOCK_EXPRESSION} AS stock,
         m.requiere_receta,
         m.imagen,
         m.activo,
         m.created_at,
         m.updated_at,
         m.created_by,
         m.updated_by
    FROM medicamento m
`;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return Boolean(value);
}

function formatMedicamento(row) {
  if (!row) return null;
  return {
    idMedicamento: row.id_medicamento,
    codigoBarras: row.codigo_barras,
    nombreComercial: row.nombre_comercial,
    nombreGenerico: row.nombre_generico,
    descripcion: row.descripcion,
    idCategoria: row.id_categoria,
    tipoProducto: row.tipo_producto,
    presentacion: row.presentacion,
    precioCompra: Number(row.precio_compra),
    precioVenta: Number(row.precio_venta),
    stock: Number(row.stock) || 0,
    requiereReceta: Boolean(row.requiere_receta),
    activo: Boolean(row.activo),
    imagen: row.imagen || IMAGEN_DEFAULT,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

async function getUbicacionActiva(client) {
  const result = await client.query(
    `SELECT id_ubicacion
       FROM ubicacion_inventario
      WHERE activa = TRUE
      ORDER BY id_ubicacion
      LIMIT 1`
  );
  if (!result.rows[0]) {
    throw httpError(400, 'No hay ubicaciones de inventario activas');
  }
  return result.rows[0].id_ubicacion;
}

async function crearLoteConStock(client, idMedicamento, cantidad) {
  const idUbicacion = await getUbicacionActiva(client);
  const lote = await client.query(
    `INSERT INTO lote_medicamento (
       id_medicamento, numero_lote, fecha_fabricacion, fecha_vencimiento,
       cantidad_inicial, estado, fecha_ingreso, observaciones
     ) VALUES (
       $1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '2 years',
       $3, 'activo', CURRENT_TIMESTAMP,
       'Lote creado por ajuste de stock desde el módulo de medicamentos.'
     )
     RETURNING id_lote`,
    [
      idMedicamento,
      `AJUSTE-${idMedicamento}-${Date.now()}`,
      cantidad,
    ]
  );
  const idLote = lote.rows[0].id_lote;

  await client.query(
    `INSERT INTO inventario (id_lote, id_ubicacion, cantidad_actual, stock_minimo)
     VALUES ($1, $2, $3, 0)`,
    [idLote, idUbicacion, cantidad]
  );

  return idLote;
}

async function sincronizarStockLegacy(client, idMedicamento) {
  await client.query(
    `UPDATE medicamento
        SET stock = COALESCE((
                SELECT SUM(i.cantidad_actual)
                  FROM inventario i
                  JOIN lote_medicamento l ON l.id_lote = i.id_lote
                 WHERE l.id_medicamento = $1
            ), 0),
            updated_at = CURRENT_TIMESTAMP
      WHERE id_medicamento = $1`,
    [idMedicamento]
  );
}

async function agregarStock(client, idMedicamento, cantidad) {
  const inventario = await client.query(
    `SELECT i.id_inventario
       FROM inventario i
       JOIN lote_medicamento l ON l.id_lote = i.id_lote
       JOIN ubicacion_inventario u
         ON u.id_ubicacion = i.id_ubicacion
        AND u.activa = TRUE
      WHERE l.id_medicamento = $1
        AND l.estado = 'activo'
        AND l.fecha_vencimiento >= CURRENT_DATE
      ORDER BY l.fecha_vencimiento ASC, i.id_inventario
      LIMIT 1
      FOR UPDATE`,
    [idMedicamento]
  );

  if (inventario.rows[0]) {
    await client.query(
      `UPDATE inventario
          SET cantidad_actual = cantidad_actual + $1,
              fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_inventario = $2`,
      [cantidad, inventario.rows[0].id_inventario]
    );
  } else {
    await crearLoteConStock(client, idMedicamento, cantidad);
  }
}

async function quitarStock(client, idMedicamento, cantidad) {
  let restante = cantidad;
  const filas = await client.query(
    `SELECT i.id_inventario, i.cantidad_actual
       FROM inventario i
       JOIN lote_medicamento l ON l.id_lote = i.id_lote
       JOIN ubicacion_inventario u
         ON u.id_ubicacion = i.id_ubicacion
        AND u.activa = TRUE
      WHERE l.id_medicamento = $1
        AND l.estado = 'activo'
        AND l.fecha_vencimiento >= CURRENT_DATE
        AND i.cantidad_actual > 0
      ORDER BY l.fecha_vencimiento ASC, l.fecha_ingreso ASC, i.id_inventario
      FOR UPDATE`,
    [idMedicamento]
  );

  for (const fila of filas.rows) {
    if (restante <= 0) break;
    const tomado = Math.min(fila.cantidad_actual, restante);
    await client.query(
      `UPDATE inventario
          SET cantidad_actual = cantidad_actual - $1,
              fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_inventario = $2`,
      [tomado, fila.id_inventario]
    );
    restante -= tomado;
  }

  if (restante > 0) {
    throw httpError(400, 'Stock insuficiente para realizar el ajuste');
  }
}

async function ajustarStock(client, idMedicamento, delta) {
  if (delta > 0) {
    await agregarStock(client, idMedicamento, delta);
  } else if (delta < 0) {
    await quitarStock(client, idMedicamento, Math.abs(delta));
  }
  if (delta !== 0) {
    await sincronizarStockLegacy(client, idMedicamento);
  }
}

async function listMedicamentos() {
  const result = await db.query(
    `${SELECT_MEDICAMENTO} WHERE m.activo = 1 ORDER BY m.id_medicamento DESC`
  );
  return result.rows.map(formatMedicamento);
}

async function getMedicamentoById(id, incluirInactivos = false) {
  const result = await db.query(
    `${SELECT_MEDICAMENTO}
      WHERE m.id_medicamento = $1
        ${incluirInactivos ? '' : 'AND m.activo = 1'}`,
    [Number(id)]
  );
  return formatMedicamento(result.rows[0]);
}

async function createMedicamento(userId, data) {
  const nombreComercial = data.nombreComercial || data.nombre_comercial;
  if (!nombreComercial) {
    throw httpError(400, 'El nombre comercial es requerido');
  }

  const stockInicial = Number(data.stock) || 0;
  if (!Number.isInteger(stockInicial) || stockInicial < 0) {
    throw httpError(400, 'El stock inicial debe ser un entero mayor o igual a 0');
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO medicamento (
         codigo_barras, nombre_comercial, nombre_generico,
         id_categoria, tipo_producto, presentacion,
         precio_compra, precio_venta, stock,
         requiere_receta, activo, imagen,
         created_at, updated_at, created_by, updated_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, NOW(), NOW(), $13, $13
       )
       RETURNING id_medicamento`,
      [
        data.codigoBarras || data.codigo_barras || `MED-${Date.now()}`,
        nombreComercial,
        data.nombreGenerico || data.nombre_generico || nombreComercial,
        Number(data.idCategoria !== undefined ? data.idCategoria : data.id_categoria) || 1,
        data.tipoProducto || data.tipo_producto || null,
        data.presentacion || null,
        Number(data.precioCompra !== undefined ? data.precioCompra : data.precio_compra) || 0,
        Number(data.precioVenta !== undefined ? data.precioVenta : data.precio_venta) || 0,
        0,
        toBoolean(data.requiereReceta !== undefined ? data.requiereReceta : data.requiere_receta, false) ? 1 : 0,
        data.activo !== undefined ? (toBoolean(data.activo) ? 1 : 0) : 1,
        data.imagen || data.imagenUrl || data.imagen_url || null,
        userId,
      ]
    );

    const idMedicamento = result.rows[0].id_medicamento;

    if (stockInicial > 0) {
      await crearLoteConStock(client, idMedicamento, stockInicial);
      await sincronizarStockLegacy(client, idMedicamento);
    }

    await client.query('COMMIT');
    return getMedicamentoById(idMedicamento, true);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateMedicamento(userId, id, data) {
  const actual = await getMedicamentoById(id, true);
  if (!actual) return null;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    if (data.stock !== undefined) {
      const stockDeseado = Number(data.stock);
      if (!Number.isInteger(stockDeseado) || stockDeseado < 0) {
        throw httpError(400, 'El stock debe ser un entero mayor o igual a 0');
      }
      await ajustarStock(client, Number(id), stockDeseado - actual.stock);
    }

    await client.query(
      `UPDATE medicamento SET
         codigo_barras = COALESCE($1, codigo_barras),
         nombre_comercial = COALESCE($2, nombre_comercial),
         nombre_generico = COALESCE($3, nombre_generico),
         id_categoria = COALESCE($4, id_categoria),
         tipo_producto = COALESCE($5, tipo_producto),
         presentacion = COALESCE($6, presentacion),
         precio_compra = COALESCE($7, precio_compra),
         precio_venta = COALESCE($8, precio_venta),
         imagen = COALESCE($9, imagen),
         requiere_receta = COALESCE($10, requiere_receta),
         activo = COALESCE($11, activo),
         updated_at = NOW(),
         updated_by = $12
       WHERE id_medicamento = $13`,
      [
        data.codigoBarras !== undefined ? data.codigoBarras : data.codigo_barras,
        data.nombreComercial !== undefined ? data.nombreComercial : data.nombre_comercial,
        data.nombreGenerico !== undefined ? data.nombreGenerico : data.nombre_generico,
        data.idCategoria !== undefined
          ? Number(data.idCategoria)
          : data.id_categoria !== undefined
            ? Number(data.id_categoria)
            : undefined,
        data.tipoProducto !== undefined ? data.tipoProducto : data.tipo_producto,
        data.presentacion,
        data.precioCompra !== undefined
          ? Number(data.precioCompra)
          : data.precio_compra !== undefined
            ? Number(data.precio_compra)
            : undefined,
        data.precioVenta !== undefined
          ? Number(data.precioVenta)
          : data.precio_venta !== undefined
            ? Number(data.precio_venta)
            : undefined,
        data.imagen !== undefined
          ? data.imagen
          : data.imagenUrl !== undefined
            ? data.imagenUrl
            : data.imagen_url,
        data.requiereReceta !== undefined
          ? toBoolean(data.requiereReceta)
            ? 1
            : 0
          : data.requiere_receta !== undefined
            ? toBoolean(data.requiere_receta)
              ? 1
              : 0
            : undefined,
        data.activo !== undefined ? (toBoolean(data.activo) ? 1 : 0) : undefined,
        userId,
        Number(id),
      ]
    );

    await client.query('COMMIT');
    return getMedicamentoById(id, true);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteMedicamento(id) {
  const result = await db.query(
    'UPDATE medicamento SET activo = 0, updated_at = NOW() WHERE id_medicamento = $1 RETURNING id_medicamento',
    [id]
  );
  return result.rows[0] || null;
}

async function buscarPorNombre(nombre) {
  const result = await db.query(
    `${SELECT_MEDICAMENTO}
      WHERE m.activo = 1
        AND (
          m.nombre_comercial ILIKE $1
          OR m.nombre_generico ILIKE $1
          OR m.codigo_barras ILIKE $1
          OR EXISTS (
            SELECT 1
              FROM medicamento_principio_activo mpa
              JOIN principio_activo pa ON pa.id_principio_activo = mpa.id_principio_activo
             WHERE mpa.id_medicamento = m.id_medicamento
               AND pa.nombre ILIKE $1
          )
        )
      ORDER BY m.nombre_comercial ASC`,
    [`%${nombre}%`]
  );
  return result.rows.map(formatMedicamento);
}

async function getStockCritico() {
  const result = await db.query(`
    WITH base AS (${SELECT_MEDICAMENTO})
    SELECT * FROM base
     WHERE activo = 1 AND stock <= 10
     ORDER BY stock ASC, nombre_comercial ASC
  `);
  return result.rows.map(formatMedicamento);
}

async function getSinStock() {
  const result = await db.query(`
    WITH base AS (${SELECT_MEDICAMENTO})
    SELECT * FROM base
     WHERE activo = 1 AND stock = 0
     ORDER BY nombre_comercial ASC
  `);
  return result.rows.map(formatMedicamento);
}

async function actualizarStockIncremental(id, cantidad, operacion) {
  const cantidadMovimiento = Math.abs(Number(cantidad));
  if (!Number.isInteger(cantidadMovimiento) || cantidadMovimiento <= 0) {
    throw httpError(400, 'La cantidad debe ser un entero mayor a 0');
  }
  if (!['sumar', 'restar'].includes(operacion)) {
    throw httpError(400, 'La operación debe ser sumar o restar');
  }

  const medicamento = await getMedicamentoById(id);
  if (!medicamento) return null;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    const delta = operacion === 'restar' ? -cantidadMovimiento : cantidadMovimiento;
    await ajustarStock(client, Number(id), delta);
    await client.query('COMMIT');
    return getMedicamentoById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getMedicamentosConOferta() {
  const query = `
    SELECT 
      m.id_medicamento AS "idMedicamento",
      m.codigo_barras AS "codigoBarras",
      m.nombre_comercial AS "nombreComercial",
      m.nombre_generico AS "nombreGenerico",
      m.presentacion,
      m.precio_venta AS "precioOriginal",
      o.porcentaje_descuento AS "porcentajeDescuento",
      ROUND(m.precio_venta * (1 - (o.porcentaje_descuento / 100.0)), 2) AS "precioConDescuento",
      o.nombre_oferta AS "nombreOferta",
      o.fecha_fin AS "vencimientoOferta"
    FROM medicamento m
    INNER JOIN oferta_medicamento om ON m.id_medicamento = om.id_medicamento
    INNER JOIN oferta o ON om.id_oferta = o.id_oferta
    WHERE m.activo = 1 AND o.activo = TRUE AND o.fecha_fin >= CURRENT_DATE
    ORDER BY m.nombre_comercial ASC
  `;
  const result = await db.query(query);
  return result.rows;
}

async function getEstadisticas() {
  const result = await db.query(`
    WITH stock AS (
      SELECT m.id_medicamento,
             m.requiere_receta,
             m.precio_compra,
             COALESCE(SUM(i.cantidad_actual), 0)::integer AS stock
        FROM medicamento m
        LEFT JOIN lote_medicamento l ON l.id_medicamento = m.id_medicamento
        LEFT JOIN inventario i ON i.id_lote = l.id_lote
       WHERE m.activo = 1
       GROUP BY m.id_medicamento, m.requiere_receta, m.precio_compra
    )
    SELECT
      COUNT(*)::integer AS "totalMedicamentos",
      COALESCE(SUM(stock), 0)::integer AS "totalUnidadesInventario",
      COALESCE(SUM(stock * precio_compra), 0)::numeric AS "valorTotalInventario",
      SUM(CASE WHEN requiere_receta = 1 THEN 1 ELSE 0 END)::integer AS "totalRequiereReceta",
      SUM(CASE WHEN stock <= 10 THEN 1 ELSE 0 END)::integer AS "totalStockCritico",
      SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END)::integer AS "totalAgotados"
    FROM stock
  `);
  return result.rows[0];
}

async function asignarOfertaAMedicamento(_userId, data) {
  const queryText = `
    INSERT INTO oferta_medicamento (id_oferta, id_medicamento, fecha_asignacion)
    VALUES ($1, $2, NOW())
    RETURNING *;
  `;
  const values = [
    Number(data.idOferta !== undefined ? data.idOferta : data.id_oferta),
    Number(data.idMedicamento !== undefined ? data.idMedicamento : data.id_medicamento),
  ];
  const result = await db.query(queryText, values);
  return result.rows[0];
}

module.exports = {
  formatMedicamento,
  listMedicamentos,
  getMedicamentoById,
  createMedicamento,
  updateMedicamento,
  deleteMedicamento,
  buscarPorNombre,
  getStockCritico,
  getSinStock,
  actualizarStockIncremental,
  getMedicamentosConOferta,
  getEstadisticas,
  asignarOfertaAMedicamento,
};