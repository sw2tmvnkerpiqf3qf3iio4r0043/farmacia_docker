const db = require('../db/db');

const ESTADOS_VENTA = ['pendiente', 'en_camino', 'completada', 'anulada', 'devuelta_parcial', 'devuelta_total'];
const ESTADOS_CAMBIABLES = ['pendiente', 'en_camino', 'completada'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatDetalle(row) {
  return {
    idDetalleVenta: row.id_detalle_venta,
    idMedicamento: row.id_medicamento,
    medicamento: row.medicamento_nombre,
    idLote: row.id_lote,
    numeroLote: row.numero_lote,
    idReceta: row.id_receta,
    cantidad: row.cantidad,
    precioUnitario: Number(row.precio_unitario),
    descuento: Number(row.descuento),
    subtotal: Number(row.subtotal),
    recetaPresentada: Boolean(row.receta_presentada),
  };
}

function formatPago(row) {
  return {
    idPago: row.id_pago,
    idMetodoPago: row.id_metodo_pago,
    metodoPago: row.metodo_pago_nombre,
    monto: Number(row.monto),
    referencia: row.referencia,
    fechaPago: row.fecha_pago,
    estadoPago: row.estado_pago,
  };
}

function formatVenta(row) {
  if (!row) return null;
  const totalVenta = Number(row.total_venta);
  const totalPagado = Number(row.total_pagado || 0);
  return {
    idVenta: row.id_venta,
    idEmpleado: row.id_empleado,
    empleado: row.empleado_nombre,
    idCliente: row.id_cliente,
    cliente: row.cliente_nombre,
    fechaVenta: row.fecha_venta,
    totalVenta,
    estado: row.estado,
    idUbicacion: row.id_ubicacion || null,
    observaciones: row.observaciones,
    totalPagado,
    saldo: Number((totalVenta - totalPagado).toFixed(2)),
    detalles: row.detalles || undefined,
    pagos: row.pagos || undefined,
  };
}

const SELECT_VENTA = `
  SELECT v.*,
         pc.nombre_completo AS cliente_nombre,
         pe.nombre_completo AS empleado_nombre,
         COALESCE((
           SELECT SUM(pg.monto)
             FROM pago pg
            WHERE pg.id_venta = v.id_venta
              AND pg.estado_pago = 'confirmado'
         ), 0) AS total_pagado
    FROM venta v
    LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
    LEFT JOIN persona pc ON pc.id_persona = c.id_persona
    LEFT JOIN empleado e ON e.id_empleado = v.id_empleado
    LEFT JOIN persona pe ON pe.id_persona = e.id_persona
`;

async function getDetalles(idVenta, client = db) {
  const result = await client.query(
    `SELECT dv.*,
            m.nombre_comercial AS medicamento_nombre,
            l.numero_lote
       FROM detalle_venta dv
       JOIN medicamento m ON m.id_medicamento = dv.id_medicamento
       LEFT JOIN lote_medicamento l ON l.id_lote = dv.id_lote
      WHERE dv.id_venta = $1
      ORDER BY dv.id_detalle_venta`,
    [idVenta]
  );
  return result.rows.map(formatDetalle);
}

async function getPagos(idVenta, client = db) {
  const result = await client.query(
    `SELECT pg.*, mp.nombre AS metodo_pago_nombre
       FROM pago pg
       JOIN metodo_pago mp ON mp.id_metodo_pago = pg.id_metodo_pago
      WHERE pg.id_venta = $1
      ORDER BY pg.id_pago`,
    [idVenta]
  );
  return result.rows.map(formatPago);
}

async function getTotalPagado(idVenta, client = db, soloConfirmados = true) {
  const result = await client.query(
    `SELECT COALESCE(SUM(monto), 0) AS total
       FROM pago
      WHERE id_venta = $1
        AND estado_pago ${soloConfirmados ? "= 'confirmado'" : "<> 'anulado'"}`,
    [idVenta]
  );
  return Number(result.rows[0].total);
}

async function listVentas(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.estado) {
    values.push(filters.estado);
    conditions.push(`v.estado = $${values.length}`);
  }
  if (filters.idCliente) {
    values.push(filters.idCliente);
    conditions.push(`v.id_cliente = $${values.length}`);
  }
  if (filters.idEmpleado) {
    values.push(filters.idEmpleado);
    conditions.push(`v.id_empleado = $${values.length}`);
  }
  if (filters.desde) {
    values.push(filters.desde);
    conditions.push(`v.fecha_venta >= $${values.length}::date`);
  }
  if (filters.hasta) {
    values.push(filters.hasta);
    conditions.push(`v.fecha_venta < ($${values.length}::date + INTERVAL '1 day')`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `${SELECT_VENTA} ${where} ORDER BY v.fecha_venta DESC, v.id_venta DESC`,
    values
  );
  return result.rows.map(formatVenta);
}

async function getVentaById(id) {
  const result = await db.query(`${SELECT_VENTA} WHERE v.id_venta = $1`, [id]);
  if (!result.rows[0]) return null;

  const venta = formatVenta(result.rows[0]);
  const [detalles, pagos] = await Promise.all([getDetalles(id), getPagos(id)]);
  venta.detalles = detalles;
  venta.pagos = pagos;
  return venta;
}

async function getVentasByCliente(idCliente) {
  const result = await db.query(
    `${SELECT_VENTA} WHERE v.id_cliente = $1 ORDER BY v.fecha_venta DESC, v.id_venta DESC`,
    [idCliente]
  );
  return result.rows.map(formatVenta);
}

async function getComprobante(idVenta) {
  const venta = await getVentaById(idVenta);
  if (!venta) return null;

  const totalDescuentos = venta.detalles.reduce((total, detalle) => total + detalle.descuento, 0);
  const subtotal = Number((venta.totalVenta + totalDescuentos).toFixed(2));

  return {
    numeroComprobante: `V-${String(venta.idVenta).padStart(6, '0')}`,
    fechaEmision: venta.fechaVenta,
    estado: venta.estado,
    cliente: venta.idCliente
      ? { idCliente: venta.idCliente, nombre: venta.cliente }
      : null,
    empleado: venta.idEmpleado
      ? { idEmpleado: venta.idEmpleado, nombre: venta.empleado }
      : null,
    items: venta.detalles.map((detalle) => ({
      idMedicamento: detalle.idMedicamento,
      medicamento: detalle.medicamento,
      numeroLote: detalle.numeroLote,
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precioUnitario,
      descuento: detalle.descuento,
      subtotal: detalle.subtotal,
      recetaPresentada: detalle.recetaPresentada,
    })),
    subtotal,
    totalDescuentos: Number(totalDescuentos.toFixed(2)),
    total: venta.totalVenta,
    pagos: venta.pagos.map((pago) => ({
      idPago: pago.idPago,
      metodoPago: pago.metodoPago,
      monto: pago.monto,
      referencia: pago.referencia,
      fechaPago: pago.fechaPago,
      estadoPago: pago.estadoPago,
    })),
    totalPagado: venta.totalPagado,
    saldo: venta.saldo,
    observaciones: venta.observaciones,
  };
}

async function getMetodosPago() {
  const result = await db.query(
    `SELECT id_metodo_pago, nombre
       FROM metodo_pago
      WHERE activo = true
      ORDER BY id_metodo_pago`
  );
  return result.rows.map((row) => ({
    idMetodoPago: row.id_metodo_pago,
    nombre: row.nombre,
  }));
}

async function resolveEmpleado(client, userId, idEmpleado) {
  let empleadoId = idEmpleado !== undefined && idEmpleado !== null ? Number(idEmpleado) : null;

  if (!empleadoId && userId) {
    const usuario = await client.query(
      'SELECT id_empleado FROM usuario WHERE id_usuario = $1',
      [userId]
    );
    empleadoId = usuario.rows[0] ? usuario.rows[0].id_empleado : null;
  }

  if (empleadoId) {
    const empleado = await client.query(
      'SELECT activo FROM empleado WHERE id_empleado = $1',
      [empleadoId]
    );
    if (!empleado.rows[0]) {
      throw httpError(400, `El empleado ${empleadoId} no existe`);
    }
    if (!empleado.rows[0].activo) {
      throw httpError(400, `El empleado ${empleadoId} está inactivo`);
    }
  }

  return empleadoId;
}

async function validarCliente(client, idCliente) {
  if (idCliente === null || idCliente === undefined) return null;
  const clienteId = Number(idCliente);
  if (!Number.isInteger(clienteId)) {
    throw httpError(400, 'El ID del cliente debe ser entero');
  }
  const result = await client.query(
    'SELECT activo FROM cliente WHERE id_cliente = $1',
    [clienteId]
  );
  if (!result.rows[0]) {
    throw httpError(400, `El cliente ${clienteId} no existe`);
  }
  if (!result.rows[0].activo) {
    throw httpError(400, `El cliente ${clienteId} está inactivo`);
  }
  return clienteId;
}

async function validarUbicacion(client, idUbicacion) {
  if (idUbicacion === null || idUbicacion === undefined || idUbicacion === '') return null;
  const ubicacionId = Number(idUbicacion);
  if (!Number.isInteger(ubicacionId) || ubicacionId <= 0) {
    throw httpError(400, 'El ID de la ubicación debe ser entero');
  }
  const result = await client.query(
    'SELECT 1 FROM ubicacion_inventario WHERE id_ubicacion = $1',
    [ubicacionId]
  );
  if (result.rows.length === 0) {
    throw httpError(400, `La ubicación ${ubicacionId} no existe`);
  }
  return ubicacionId;
}

async function prepararDetalles(client, detalles) {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw httpError(400, 'La venta debe incluir al menos un detalle');
  }

  const detallesNormalizados = detalles.map((detalle) => {
    const idMedicamento = Number(
      detalle.idMedicamento !== undefined ? detalle.idMedicamento : detalle.id_medicamento
    );
    const cantidad = Number(detalle.cantidad);
    const descuentoIngresado =
      detalle.descuento !== undefined && detalle.descuento !== null
        ? Number(detalle.descuento)
        : 0;

    if (!Number.isInteger(idMedicamento) || idMedicamento <= 0) {
      throw httpError(400, 'El ID del medicamento de cada detalle debe ser un entero mayor a 0');
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw httpError(400, 'La cantidad de cada detalle debe ser un entero mayor a 0');
    }
    if (!Number.isFinite(descuentoIngresado) || descuentoIngresado < 0) {
      throw httpError(400, 'El descuento de cada detalle debe ser mayor o igual a 0');
    }

    const idReceta =
      detalle.idReceta !== undefined && detalle.idReceta !== null
        ? Number(detalle.idReceta)
        : null;
    if (idReceta !== null && !Number.isInteger(idReceta)) {
      throw httpError(400, 'El ID de la receta debe ser entero');
    }

    let recetaPresentada = detalle.recetaPresentada;
    if (recetaPresentada === undefined) {
      recetaPresentada = idReceta !== null;
    }
    recetaPresentada = Boolean(recetaPresentada);

    if (recetaPresentada && idReceta === null) {
      throw httpError(400, 'Debe indicar idReceta cuando recetaPresentada es true');
    }
    if (idReceta !== null && !recetaPresentada) {
      throw httpError(400, 'recetaPresentada debe ser true cuando se envía idReceta');
    }

    return {
      idMedicamento,
      idReceta,
      cantidad,
      precioUnitarioIngresado:
        detalle.precioUnitario !== undefined && detalle.precioUnitario !== null
          ? Number(detalle.precioUnitario)
          : detalle.precio_unitario,
      descuento: Number(descuentoIngresado.toFixed(2)),
      recetaPresentada, 
    };
  });

  return Promise.all(detallesNormalizados.map(async (detalle) => {
    const medicamento = await client.query(
      'SELECT precio_venta, activo FROM medicamento WHERE id_medicamento = $1',
      [detalle.idMedicamento]
    );
    if (!medicamento.rows[0]) {
      throw httpError(400, `El medicamento ${detalle.idMedicamento} no existe`);
    }
    if (!medicamento.rows[0].activo) {
      throw httpError(400, `El medicamento ${detalle.idMedicamento} está inactivo`);
    }

    const precioUnitario =
      detalle.precioUnitarioIngresado !== undefined && detalle.precioUnitarioIngresado !== null
        ? Number(detalle.precioUnitarioIngresado)
        : Number(medicamento.rows[0].precio_venta);

    if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
      throw httpError(400, 'El precio unitario de cada detalle debe ser mayor o igual a 0');
    }

    const precioRedondeado = Number(precioUnitario.toFixed(2));
    const subtotal = Number((detalle.cantidad * precioRedondeado - detalle.descuento).toFixed(2));
    if (subtotal < 0) {
      throw httpError(400, 'El descuento no puede superar el importe del detalle');
    }

    return {
      idMedicamento: detalle.idMedicamento,
      idReceta: detalle.idReceta,
      cantidad: detalle.cantidad,
      precioUnitario: precioRedondeado,
      descuento: detalle.descuento,
      subtotal,
      recetaPresentada: detalle.recetaPresentada,
    };
  }));
}

function prepararPagos(pagos, totalVenta) {
  if (pagos === undefined || pagos === null) return [];
  if (!Array.isArray(pagos)) {
    throw httpError(400, 'Los pagos deben ser un arreglo');
  }

  const normalizados = pagos.map((pago) => {
    const idMetodoPago = Number(pago.idMetodoPago !== undefined ? pago.idMetodoPago : pago.id_metodo_pago);
    const monto = Number(pago.monto);
    const estadoPago = pago.estadoPago || pago.estado_pago || 'confirmado';

    if (!Number.isInteger(idMetodoPago) || idMetodoPago <= 0) {
      throw httpError(400, 'El ID del método de pago debe ser un entero mayor a 0');
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      throw httpError(400, 'El monto de cada pago debe ser mayor a 0');
    }
    if (!['pendiente', 'confirmado'].includes(estadoPago)) {
      throw httpError(400, 'El estado del pago debe ser pendiente o confirmado');
    }

    return {
      idMetodoPago,
      monto: Number(monto.toFixed(2)),
      referencia: pago.referencia || null,
      estadoPago,
    };
  });

  const totalRegistrado = normalizados.reduce((total, pago) => total + pago.monto, 0);
  if (totalRegistrado > totalVenta) {
    throw httpError(
      400,
      `Los pagos registrados (${totalRegistrado.toFixed(2)}) superan el total de la venta (${totalVenta.toFixed(2)})`
    );
  }

  return normalizados;
}

async function crearVenta(userId, data) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const empleadoId = await resolveEmpleado(
      client,
      userId,
      data.idEmpleado !== undefined ? data.idEmpleado : data.id_empleado
    );
    const clienteId = await validarCliente(
      client,
      data.idCliente !== undefined ? data.idCliente : data.id_cliente
    );
    const ubicacionId = await validarUbicacion(
      client,
      data.idUbicacion !== undefined ? data.idUbicacion : data.id_ubicacion
    );

    const detalles = await prepararDetalles(client, data.detalles);
    const totalVenta = Number(
      detalles.reduce((total, detalle) => total + detalle.subtotal, 0).toFixed(2)
    );
    const pagos = prepararPagos(data.pagos, totalVenta);

    const estadoSolicitado = data.estado || 'pendiente';
    if (!['pendiente', 'completada'].includes(estadoSolicitado)) {
      throw httpError(400, 'El estado inicial de la venta debe ser pendiente o completada');
    }

    const fechaVenta = data.fechaVenta !== undefined ? data.fechaVenta : data.fecha_venta;

    const ventaResult = await client.query(
      `INSERT INTO venta (id_empleado, id_cliente, fecha_venta, total_venta, estado, observaciones, id_ubicacion)
       VALUES ($1, $2, COALESCE($3, CURRENT_TIMESTAMP), 0, 'pendiente', $4, $5)
       RETURNING id_venta`,
      [empleadoId, clienteId, fechaVenta || null, data.observaciones || null, ubicacionId]
    );
    const idVenta = ventaResult.rows[0].id_venta;

    // Insertar detalles (el trigger de PostgreSQL se encarga del stock)
    for (const detalle of detalles) {
      await client.query(
        `INSERT INTO detalle_venta (
           id_venta, id_medicamento, id_receta, cantidad,
           precio_unitario, descuento, subtotal, receta_presentada
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          idVenta,
          detalle.idMedicamento,
          detalle.idReceta,
          detalle.cantidad,
          detalle.precioUnitario,
          detalle.descuento,
          detalle.subtotal,
          detalle.recetaPresentada,
        ]
      );
    }

    // Insertar pagos
    for (const pago of pagos) {
      await client.query(
        `INSERT INTO pago (id_venta, id_metodo_pago, monto, referencia, estado_pago)
         VALUES ($1, $2, $3, $4, $5)`,
        [idVenta, pago.idMetodoPago, pago.monto, pago.referencia, pago.estadoPago]
      );
    }

    if (estadoSolicitado === 'completada') {
      const totalConfirmado = pagos
        .filter((pago) => pago.estadoPago === 'confirmado')
        .reduce((total, pago) => total + pago.monto, 0);
        
      if (Number(totalConfirmado.toFixed(2)) < totalVenta) {
        throw httpError(
          400,
          `No se puede completar la venta. Total: ${totalVenta.toFixed(2)}, pagado confirmado: ${totalConfirmado.toFixed(2)}`
        );
      }
      await client.query('UPDATE venta SET estado = $1 WHERE id_venta = $2', ['completada', idVenta]);
    }

    await client.query('COMMIT');
    
    // ✅ CORRECCIÓN FINAL: Devolvemos una respuesta simple para evitar bloqueos
    return {
      idVenta: idVenta,
      totalVenta: totalVenta,
      estado: estadoSolicitado,
      idUbicacion: ubicacionId,
      mensaje: 'Venta creada exitosamente'
    };
    
  } catch (err) {
    console.log("═══════════════════════════════════════");
    console.log("❌ ERROR EN CREAR VENTA");
    console.log("Mensaje:", err.message);
    console.log("Código:", err.code);
    console.log("Detalle:", err.detail);
    console.log("═══════════════════════════════════════");
    
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function registrarPago(idVenta, data) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const ventaResult = await client.query(
      'SELECT id_venta, total_venta, estado FROM venta WHERE id_venta = $1 FOR UPDATE',
      [idVenta]
    );
    if (!ventaResult.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    const venta = ventaResult.rows[0];
    if (['anulada', 'devuelta_total'].includes(venta.estado)) {
      throw httpError(400, `No se puede registrar un pago para una venta en estado ${venta.estado}`);
    }

    const pagos = prepararPagos([data], Number(venta.total_venta));
    const pago = pagos[0];

    await client.query(
      `INSERT INTO pago (id_venta, id_metodo_pago, monto, referencia, estado_pago)
       VALUES ($1, $2, $3, $4, $5)`,
      [idVenta, pago.idMetodoPago, pago.monto, pago.referencia, pago.estadoPago]
    );

    if (venta.estado === 'pendiente') {
      const totalPagado = await getTotalPagado(idVenta, client, true);
      const detalles = await client.query(
        'SELECT COUNT(*)::integer AS total FROM detalle_venta WHERE id_venta = $1',
        [idVenta]
      );
      if (
        detalles.rows[0].total > 0 &&
        totalPagado >= Number(venta.total_venta) &&
        Number(venta.total_venta) > 0
      ) {
        await client.query('UPDATE venta SET estado = $1 WHERE id_venta = $2', ['completada', idVenta]);
      }
    }

    await client.query('COMMIT');
    return getVentaById(idVenta);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function anularPago(idVenta, idPago) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const ventaResult = await client.query(
      'SELECT id_venta, total_venta, estado FROM venta WHERE id_venta = $1 FOR UPDATE',
      [idVenta]
    );
    if (!ventaResult.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    const pagoResult = await client.query(
      'SELECT * FROM pago WHERE id_pago = $1 AND id_venta = $2 FOR UPDATE',
      [idPago, idVenta]
    );
    if (!pagoResult.rows[0]) {
      throw httpError(404, `El pago ${idPago} no existe para la venta ${idVenta}`);
    }

    if (pagoResult.rows[0].estado_pago !== 'anulado') {
      await client.query(
        'UPDATE pago SET estado_pago = $1 WHERE id_pago = $2',
        ['anulado', idPago]
      );

      const totalPagado = await getTotalPagado(idVenta, client, true);
      if (
        ventaResult.rows[0].estado === 'completada' &&
        totalPagado < Number(ventaResult.rows[0].total_venta)
      ) {
        await client.query('UPDATE venta SET estado = $1 WHERE id_venta = $2', ['pendiente', idVenta]);
      }
    }

    await client.query('COMMIT');
    return getVentaById(idVenta);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function anularVenta(idVenta, userId, data = {}) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const ventaResult = await client.query(
      'SELECT * FROM venta WHERE id_venta = $1 FOR UPDATE',
      [idVenta]
    );
    if (!ventaResult.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    const venta = ventaResult.rows[0];
    if (venta.estado === 'anulada') {
      throw httpError(409, `La venta ${idVenta} ya está anulada`);
    }
    if (['devuelta_parcial', 'devuelta_total'].includes(venta.estado)) {
      throw httpError(400, `No se puede anular una venta en estado ${venta.estado}`);
    }

    await client.query(
      `UPDATE pago
       SET estado_pago = 'anulado'
       WHERE id_venta = $1
         AND estado_pago <> 'anulado'`,
      [idVenta]
    );

    const detallesResult = await client.query(
      'SELECT id_medicamento, id_lote, cantidad FROM detalle_venta WHERE id_venta = $1 ORDER BY id_detalle_venta',
      [idVenta]
    );

    for (const detalle of detallesResult.rows) {
      const inventarioResult = await client.query(
        `SELECT i.id_inventario
         FROM inventario i
         JOIN ubicacion_inventario u
           ON u.id_ubicacion = i.id_ubicacion
          AND u.activa = true
         WHERE i.id_lote = $1
         ORDER BY i.id_inventario
         LIMIT 1
         FOR UPDATE`,
        [detalle.id_lote]
      );

      if (inventarioResult.rows[0]) {
        await client.query(
          `UPDATE inventario
           SET cantidad_actual = cantidad_actual + $1,
               fecha_actualizacion = CURRENT_TIMESTAMP
           WHERE id_inventario = $2`,
          [detalle.cantidad, inventarioResult.rows[0].id_inventario]
        );
      } else {
        const ubicacion = await client.query(
          `SELECT id_ubicacion
           FROM ubicacion_inventario
           WHERE activa = true
           ORDER BY id_ubicacion
           LIMIT 1`
        );
        if (!ubicacion.rows[0]) {
          throw httpError(
            400,
            `No hay una ubicación activa para restaurar el stock del lote ${detalle.id_lote}`
          );
        }
        await client.query(
          `INSERT INTO inventario (id_lote, id_ubicacion, cantidad_actual, stock_minimo)
           VALUES ($1, $2, $3, 0)`,
          [detalle.id_lote, ubicacion.rows[0].id_ubicacion, detalle.cantidad]
        );
      }

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
        [detalle.id_medicamento]
      );
    }

    let observaciones = venta.observaciones;
    const motivo = data.motivo ? String(data.motivo).trim() : '';
    if (motivo) {
      observaciones = observaciones
        ? `${observaciones} | ANULACIÓN: ${motivo}`
        : `ANULACIÓN: ${motivo}`;
    }

    await client.query(
      'UPDATE venta SET estado = $1, observaciones = $2 WHERE id_venta = $3',
      ['anulada', observaciones, idVenta]
    );

    await client.query('COMMIT');
    return getVentaById(idVenta);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function cambiarEstado(idVenta, estado) {
  if (!ESTADOS_CAMBIABLES.includes(estado)) {
    throw httpError(400, `El estado debe ser uno de: ${ESTADOS_CAMBIABLES.join(', ')}`);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const actual = await client.query(
      'SELECT id_venta, total_venta FROM venta WHERE id_venta = $1 FOR UPDATE',
      [idVenta]
    );
    if (!actual.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    if (estado === 'completada') {
      const detalles = await client.query(
        'SELECT COUNT(*)::integer AS total FROM detalle_venta WHERE id_venta = $1',
        [idVenta]
      );
      if (Number(detalles.rows[0].total) === 0) {
        throw httpError(400, 'No se puede completar la venta porque no tiene detalles');
      }

      const total = Number(actual.rows[0].total_venta || 0);
      const totalPagado = await getTotalPagado(idVenta, client, true);
      if (totalPagado < total) {
        throw httpError(
          400,
          `No se puede completar la venta. Total: ${total.toFixed(2)}, pagado confirmado: ${totalPagado.toFixed(2)}`
        );
      }
    }

    await client.query('UPDATE venta SET estado = $1 WHERE id_venta = $2', [estado, idVenta]);
    await client.query('COMMIT');
    return getVentaById(idVenta);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  ESTADOS_VENTA,
  listVentas,
  getVentaById,
  getVentasByCliente,
  getComprobante,
  getMetodosPago,
  crearVenta,
  registrarPago,
  anularPago,
  anularVenta,
  cambiarEstado,
};
