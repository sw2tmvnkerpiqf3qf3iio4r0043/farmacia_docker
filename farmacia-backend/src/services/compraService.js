const db = require('../db/db');

const ESTADOS_VALIDOS = ['pendiente', 'completada', 'devuelta_parcial', 'devuelta_total'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatDetalle(row) {
  return {
    idDetalleCompra: row.id_detalle_compra,
    idMedicamento: row.id_medicamento,
    medicamento: row.medicamento_nombre,
    idLote: row.id_lote,
    numeroLote: row.numero_lote,
    cantidad: row.cantidad,
    precioUnitario: Number(row.precio_unitario),
    subtotal: Number(row.subtotal),
  };
}

function formatCompra(row) {
  if (!row) return null;
  return {
    idCompra: row.id_compra,
    idProveedor: row.id_proveedor,
    proveedor: row.proveedor_nombre,
    numeroFactura: row.numero_factura,
    fechaCompra: row.fecha_compra,
    totalCompra: Number(row.total_compra),
    estado: row.estado,
    observaciones: row.observaciones,
    fechaRegistro: row.fecha_registro,
    detalles: row.detalles || undefined,
  };
}

const SELECT_COMPRA = `
  SELECT c.*, p.nombre_empresa AS proveedor_nombre
    FROM compra c
    JOIN proveedor p ON p.id_proveedor = c.id_proveedor
`;

function calcularDetalles(detalles) {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw httpError(400, 'La compra debe incluir al menos un detalle');
  }
  return detalles.map((d) => {
    const cantidad = Number(d.cantidad);
    const precioUnitario = Number(d.precioUnitario !== undefined ? d.precioUnitario : d.precio_unitario);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw httpError(400, 'La cantidad de cada detalle debe ser un entero mayor a 0');
    }
    if (isNaN(precioUnitario) || precioUnitario < 0) {
      throw httpError(400, 'El precio unitario de cada detalle debe ser un número positivo');
    }
    const subtotal = Number((cantidad * precioUnitario).toFixed(2));
    return {
      idMedicamento: d.idMedicamento !== undefined ? d.idMedicamento : d.id_medicamento,
      idLote: d.idLote !== undefined ? d.idLote : d.id_lote || null,
      nuevoLote: d.nuevoLote || null,
      cantidad,
      precioUnitario,
      subtotal,
    };
  });
}

async function resolverLote(client, detalle, idProveedor) {
  if (detalle.idLote) {
    const lote = await client.query(
      'SELECT id_medicamento, activo FROM lote_medicamento WHERE id_lote = $1',
      [detalle.idLote]
    );
    if (!lote.rows[0]) {
      throw httpError(400, `El lote ${detalle.idLote} no existe`);
    }
    if (Number(lote.rows[0].id_medicamento) !== Number(detalle.idMedicamento)) {
      throw httpError(400, `El lote ${detalle.idLote} no corresponde al medicamento`);
    }
    return Number(detalle.idLote);
  }

  if (!detalle.nuevoLote) {
    throw httpError(400, 'Cada detalle debe indicar un lote existente o los datos de uno nuevo');
  }

  const nuevo = detalle.nuevoLote;
  const numeroLote = String(nuevo.numeroLote || '').trim();
  const fechaFabricacion = new Date(nuevo.fechaFabricacion);
  const fechaVencimiento = new Date(nuevo.fechaVencimiento);

  if (!numeroLote) {
    throw httpError(400, 'El número de lote es requerido');
  }
  if (Number.isNaN(fechaFabricacion.getTime()) || Number.isNaN(fechaVencimiento.getTime())) {
    throw httpError(400, 'Las fechas del nuevo lote son inválidas');
  }
  if (fechaVencimiento <= fechaFabricacion) {
    throw httpError(400, 'La fecha de vencimiento debe ser posterior a la fecha de fabricación');
  }

  const duplicado = await client.query(
    'SELECT 1 FROM lote_medicamento WHERE id_medicamento = $1 AND LOWER(numero_lote) = LOWER($2)',
    [detalle.idMedicamento, numeroLote]
  );
  if (duplicado.rows.length > 0) {
    throw httpError(409, 'Ya existe un lote con ese número para el medicamento');
  }

  const insertado = await client.query(
    `INSERT INTO lote_medicamento
       (id_medicamento, id_proveedor, numero_lote, fecha_fabricacion, fecha_vencimiento,
        cantidad_inicial, estado, observaciones)
     VALUES ($1, $2, $3, $4, $5, $6, 'activo', $7)
     RETURNING id_lote`,
    [
      detalle.idMedicamento,
      nuevo.idProveedor || idProveedor || null,
      numeroLote,
      nuevo.fechaFabricacion,
      nuevo.fechaVencimiento,
      detalle.cantidad,
      nuevo.observaciones || null,
    ]
  );
  return insertado.rows[0].id_lote;
}

async function getDetalles(idCompra, client = db) {
  const result = await client.query(
    `SELECT d.*, m.nombre_comercial AS medicamento_nombre, l.numero_lote
       FROM detalle_compra d
       JOIN medicamento m ON m.id_medicamento = d.id_medicamento
       LEFT JOIN lote_medicamento l ON l.id_lote = d.id_lote
      WHERE d.id_compra = $1
      ORDER BY d.id_detalle_compra`,
    [idCompra]
  );
  return result.rows.map(formatDetalle);
}

async function listCompras() {
  const result = await db.query(`${SELECT_COMPRA} ORDER BY c.fecha_compra DESC, c.id_compra DESC`);
  return result.rows.map(formatCompra);
}

async function getCompraById(id) {
  const result = await db.query(`${SELECT_COMPRA} WHERE c.id_compra = $1`, [id]);
  if (!result.rows[0]) return null;
  const compra = formatCompra(result.rows[0]);
  compra.detalles = await getDetalles(id);
  return compra;
}

async function getComprasByProveedor(idProveedor) {
  const result = await db.query(
    `${SELECT_COMPRA} WHERE c.id_proveedor = $1 ORDER BY c.fecha_compra DESC`,
    [idProveedor]
  );
  return result.rows.map(formatCompra);
}

async function generarEntradasInventario(client, idCompra, idUbicacion) {
  let ubicacion = idUbicacion;
  if (!ubicacion) {
    const u = await client.query(
      'SELECT id_ubicacion FROM ubicacion_inventario WHERE activa = TRUE ORDER BY id_ubicacion LIMIT 1'
    );
    if (u.rows.length === 0) {
      throw httpError(400, 'No hay ubicaciones activas para generar la entrada de inventario');
    }
    ubicacion = u.rows[0].id_ubicacion;
  }

  const detalles = await client.query(
    'SELECT id_lote, cantidad FROM detalle_compra WHERE id_compra = $1 AND id_lote IS NOT NULL',
    [idCompra]
  );

  for (const detalle of detalles.rows) {
    await client.query(
      `INSERT INTO inventario (id_lote, id_ubicacion, cantidad_actual, stock_minimo)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (id_lote, id_ubicacion)
       DO UPDATE SET cantidad_actual = inventario.cantidad_actual + EXCLUDED.cantidad_actual,
                     fecha_actualizacion = NOW()`,
      [detalle.id_lote, ubicacion, detalle.cantidad]
    );
  }
}

async function createCompra(userId, data) {
  const proveedor = await db.query(
    'SELECT id_proveedor, activo FROM proveedor WHERE id_proveedor = $1',
    [data.idProveedor]
  );
  if (proveedor.rows.length === 0) {
    throw httpError(400, 'El proveedor indicado no existe');
  }
  if (!proveedor.rows[0].activo) {
    throw httpError(400, 'Solo se pueden registrar compras a proveedores activos');
  }

  const numeroFactura = data.numeroFactura || data.numero_factura;
  const existe = await db.query('SELECT 1 FROM compra WHERE LOWER(numero_factura) = LOWER($1)', [numeroFactura]);
  if (existe.rows.length > 0) {
    throw httpError(409, 'Ya existe una compra con ese número de factura');
  }

  const estado = data.estado || 'pendiente';
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw httpError(400, `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`);
  }

  const detalles = calcularDetalles(data.detalles);
  const total = Number(detalles.reduce((acc, d) => acc + d.subtotal, 0).toFixed(2));

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO compra (id_proveedor, numero_factura, fecha_compra, total_compra, estado, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_compra`,
      [
        data.idProveedor,
        numeroFactura,
        data.fechaCompra || data.fecha_compra || new Date(),
        total,
        estado,
        data.observaciones || null,
      ]
    );
    const idCompra = inserted.rows[0].id_compra;

    for (const d of detalles) {
      const idLote = await resolverLote(client, d, data.idProveedor);
      await client.query(
        `INSERT INTO detalle_compra (id_compra, id_medicamento, id_lote, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [idCompra, d.idMedicamento, idLote, d.cantidad, d.precioUnitario, d.subtotal]
      );
    }

    if (estado === 'completada') {
      await generarEntradasInventario(client, idCompra, data.idUbicacion || data.id_ubicacion);
    }

    await client.query('COMMIT');
    return getCompraById(idCompra);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateCompra(id, data) {
  const actual = await getCompraById(id);
  if (!actual) return null;

  const estado = data.estado !== undefined ? data.estado : actual.estado;
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw httpError(400, `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`);
  }

  const numeroFactura = data.numeroFactura !== undefined ? data.numeroFactura : actual.numeroFactura;
  const duplicado = await db.query(
    'SELECT 1 FROM compra WHERE LOWER(numero_factura) = LOWER($1) AND id_compra <> $2',
    [numeroFactura, id]
  );
  if (duplicado.rows.length > 0) {
    throw httpError(409, 'Ya existe una compra con ese número de factura');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    let total = actual.totalCompra;
    if (data.detalles !== undefined) {
      const detalles = calcularDetalles(data.detalles);
      total = Number(detalles.reduce((acc, d) => acc + d.subtotal, 0).toFixed(2));
      await client.query('DELETE FROM detalle_compra WHERE id_compra = $1', [id]);
      for (const d of detalles) {
        await client.query(
          `INSERT INTO detalle_compra (id_compra, id_medicamento, id_lote, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, d.idMedicamento, d.idLote, d.cantidad, d.precioUnitario, d.subtotal]
        );
      }
    }

    await client.query(
      `UPDATE compra SET
         id_proveedor = $1,
         numero_factura = $2,
         fecha_compra = $3,
         total_compra = $4,
         estado = $5,
         observaciones = $6
       WHERE id_compra = $7`,
      [
        data.idProveedor !== undefined ? data.idProveedor : actual.idProveedor,
        numeroFactura,
        data.fechaCompra !== undefined ? data.fechaCompra : actual.fechaCompra,
        total,
        estado,
        data.observaciones !== undefined ? data.observaciones : actual.observaciones,
        id,
      ]
    );

    await client.query('COMMIT');
    return getCompraById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function changeEstado(id, estado, idUbicacion) {
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw httpError(400, `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`);
  }

  const actual = await getCompraById(id);
  if (!actual) return null;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE compra SET estado = $1 WHERE id_compra = $2', [estado, id]);

    if (estado === 'completada' && actual.estado !== 'completada') {
      await generarEntradasInventario(client, id, idUbicacion);
    }

    await client.query('COMMIT');
    return getCompraById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteCompra(id) {
  const result = await db.query('DELETE FROM compra WHERE id_compra = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = {
  listCompras,
  getCompraById,
  getComprasByProveedor,
  createCompra,
  updateCompra,
  changeEstado,
  deleteCompra,
};
