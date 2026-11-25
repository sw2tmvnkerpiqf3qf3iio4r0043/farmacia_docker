const db = require('../db/db');

const ESTADOS_VALIDOS = ['vigente', 'usada', 'vencida', 'anulada'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatDetalle(row) {
  return {
    idDetalleReceta: row.id_detalle_receta,
    idMedicamento: row.id_medicamento,
    medicamento: row.medicamento_nombre,
    dosis: row.dosis,
    frecuencia: row.frecuencia,
    viaAdministracion: row.via_administracion,
    duracionTratamiento: row.duracion_tratamiento,
    cantidadPrescrita: row.cantidad_prescrita,
    indicaciones: row.indicaciones,
  };
}

function extraerImagenUrl(observaciones) {
  const coincide = String(observaciones || '').match(/Imagen:\s*(\/uploads\/[^\s|]+)/i);
  return coincide ? coincide[1] : null;
}

function buildObservaciones(observaciones, imagenUrl) {
  const base = String(observaciones || '').trim();
  if (!imagenUrl) return base || null;
  const imagen = `Imagen: ${imagenUrl}`;
  return base ? `${base} | ${imagen}` : imagen;
}

function limpiarObservaciones(observaciones) {
  return String(observaciones || '')
    .replace(/^Imagen:\s*\S+\s*\|\s*/i, '')
    .replace(/\s*\|\s*Imagen:\s*\S+/gi, '')
    .trim();
}

function fechaISO(date) {
  return date.toISOString().slice(0, 10);
}

function sumarDias(fecha, dias) {
  const date = fecha ? new Date(fecha) : new Date();
  date.setDate(date.getDate() + dias);
  return fechaISO(date);
}

function formatReceta(row) {
  if (!row) return null;
  return {
    idReceta: row.id_receta,
    idCliente: row.id_cliente,
    cliente: row.cliente_nombre,
    numeroReceta: row.numero_receta,
    medicoPrescriptor: row.medico_prescriptor,
    fechaEmision: row.fecha_emision,
    fechaRegistroFarmacia: row.fecha_registro_farmacia,
    fechaVencimiento: row.fecha_vencimiento,
    observacionesReceta: row.observaciones_receta,
    imagenUrl: row.imagen_url || extraerImagenUrl(row.observaciones_receta),
    estado: row.estado,
    detalles: row.detalles || undefined,
  };
}

const SELECT_RECETA = `
  SELECT r.*, p.nombre_completo AS cliente_nombre
    FROM receta_medica r
    JOIN cliente c ON c.id_cliente = r.id_cliente
    JOIN persona p ON p.id_persona = c.id_persona
`;

function validarFechas(emision, vencimiento) {
  const emi = new Date(emision);
  const ven = new Date(vencimiento);
  if (isNaN(emi.getTime()) || isNaN(ven.getTime())) {
    throw httpError(400, 'Fechas de emisión o vencimiento inválidas');
  }
  if (ven < emi) {
    throw httpError(400, 'La fecha de vencimiento debe ser mayor o igual a la fecha de emisión');
  }
}

function normalizarDetalles(detalles) {
  if (detalles === undefined || detalles === null) return [];
  if (!Array.isArray(detalles)) {
    throw httpError(400, 'Los detalles de la receta deben ser un arreglo');
  }
  return detalles.map((d) => {
    const idMedicamento = d.idMedicamento !== undefined
      ? d.idMedicamento
      : (d.id_medicamento !== undefined ? d.id_medicamento : null);
    const via = d.viaAdministracion || d.via_administracion;
    const duracion = d.duracionTratamiento || d.duracion_tratamiento;
    if (!d.dosis || !d.frecuencia || !via || !duracion) {
      throw httpError(400, 'Cada detalle requiere dosis, frecuencia, vía de administración y duración del tratamiento');
    }
    return {
      idMedicamento: idMedicamento || null,
      dosis: d.dosis,
      frecuencia: d.frecuencia,
      viaAdministracion: via,
      duracionTratamiento: duracion,
      cantidadPrescrita: d.cantidadPrescrita !== undefined ? d.cantidadPrescrita : 1,
      indicaciones: d.indicaciones || null,
    };
  });
}

async function getDetalles(idReceta, client = db) {
  const result = await client.query(
    `SELECT d.*, m.nombre_comercial AS medicamento_nombre
       FROM detalle_receta d
       LEFT JOIN medicamento m ON m.id_medicamento = d.id_medicamento
      WHERE d.id_receta = $1
      ORDER BY d.id_detalle_receta`,
    [idReceta]
  );
  return result.rows.map(formatDetalle);
}

async function listRecetas() {
  const result = await db.query(`${SELECT_RECETA} ORDER BY r.fecha_emision DESC, r.id_receta DESC`);
  return result.rows.map(formatReceta);
}

async function getRecetaById(id) {
  const result = await db.query(`${SELECT_RECETA} WHERE r.id_receta = $1`, [id]);
  if (!result.rows[0]) return null;
  const receta = formatReceta(result.rows[0]);
  receta.detalles = await getDetalles(id);
  return receta;
}

async function getRecetasByCliente(idCliente) {
  const result = await db.query(
    `${SELECT_RECETA} WHERE r.id_cliente = $1 ORDER BY r.fecha_emision DESC`,
    [idCliente]
  );
  return result.rows.map(formatReceta);
}

async function getRecetasVigentes() {
  const result = await db.query(
    `${SELECT_RECETA} WHERE r.estado = 'vigente' AND r.fecha_vencimiento >= CURRENT_DATE ORDER BY r.fecha_vencimiento ASC`
  );
  return result.rows.map(formatReceta);
}

async function createReceta(data) {
  const cliente = await db.query('SELECT 1 FROM cliente WHERE id_cliente = $1', [data.idCliente]);
  if (cliente.rows.length === 0) {
    throw httpError(400, 'El cliente indicado no existe');
  }

  const fechaEmision = data.fechaEmision || data.fecha_emision || fechaISO(new Date());
  const fechaVencimiento = data.fechaVencimiento || data.fecha_vencimiento || sumarDias(fechaEmision, 30);
  validarFechas(fechaEmision, fechaVencimiento);

  const estado = data.estado || 'vigente';
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw httpError(400, `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`);
  }

  const numeroReceta = data.numeroReceta || data.numero_receta || `REC-${Date.now()}`;
  const medicoPrescriptor = data.medicoPrescriptor || data.medico_prescriptor || 'Receta cargada por el cliente';
  const imagenUrl = data.imagenUrl || data.imagen_url || null;
  const observaciones = buildObservaciones(
    data.observacionesReceta !== undefined ? data.observacionesReceta : data.observaciones_receta,
    imagenUrl
  );
  const existe = await db.query(
    'SELECT 1 FROM receta_medica WHERE LOWER(numero_receta) = LOWER($1)',
    [numeroReceta]
  );
  if (existe.rows.length > 0) {
    throw httpError(409, 'Ya existe una receta con ese número');
  }

  const detalles = normalizarDetalles(data.detalles);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO receta_medica
         (id_cliente, numero_receta, medico_prescriptor, fecha_emision, fecha_vencimiento, observaciones_receta, imagen_url, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id_receta`,
      [
        data.idCliente,
        numeroReceta,
        medicoPrescriptor,
        fechaEmision,
        fechaVencimiento,
        observaciones,
        imagenUrl,
        estado,
      ]
    );
    const idReceta = inserted.rows[0].id_receta;

    for (const d of detalles) {
      await client.query(
        `INSERT INTO detalle_receta
           (id_receta, id_medicamento, dosis, frecuencia, via_administracion, duracion_tratamiento, cantidad_prescrita, indicaciones)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [idReceta, d.idMedicamento, d.dosis, d.frecuencia, d.viaAdministracion, d.duracionTratamiento, d.cantidadPrescrita, d.indicaciones]
      );
    }

    await client.query('COMMIT');
    return getRecetaById(idReceta);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateReceta(id, data) {
  const actual = await getRecetaById(id);
  if (!actual) return null;

  const fechaEmision = data.fechaEmision !== undefined ? data.fechaEmision : actual.fechaEmision;
  const fechaVencimiento = data.fechaVencimiento !== undefined ? data.fechaVencimiento : actual.fechaVencimiento;
  validarFechas(fechaEmision, fechaVencimiento);

  const estado = data.estado !== undefined ? data.estado : actual.estado;
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw httpError(400, `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`);
  }

  const numeroReceta = data.numeroReceta !== undefined ? data.numeroReceta : actual.numeroReceta;
  const imagenUrl = data.imagenUrl !== undefined
    ? data.imagenUrl
    : (data.imagen_url !== undefined ? data.imagen_url : actual.imagenUrl);
  const baseObservaciones = data.observacionesReceta !== undefined
    ? data.observacionesReceta
    : limpiarObservaciones(actual.observacionesReceta);
  const observaciones = buildObservaciones(baseObservaciones, imagenUrl);
  const duplicado = await db.query(
    'SELECT 1 FROM receta_medica WHERE LOWER(numero_receta) = LOWER($1) AND id_receta <> $2',
    [numeroReceta, id]
  );
  if (duplicado.rows.length > 0) {
    throw httpError(409, 'Ya existe una receta con ese número');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE receta_medica SET
         id_cliente = $1,
         numero_receta = $2,
         medico_prescriptor = $3,
         fecha_emision = $4,
         fecha_vencimiento = $5,
         observaciones_receta = $6,
         imagen_url = $7,
         estado = $8
       WHERE id_receta = $9`,
      [
        data.idCliente !== undefined ? data.idCliente : actual.idCliente,
        numeroReceta,
        data.medicoPrescriptor !== undefined ? data.medicoPrescriptor : actual.medicoPrescriptor,
        fechaEmision,
        fechaVencimiento,
        observaciones,
        imagenUrl,
        estado,
        id,
      ]
    );

    if (data.detalles !== undefined) {
      const detalles = normalizarDetalles(data.detalles);
      await client.query('DELETE FROM detalle_receta WHERE id_receta = $1', [id]);
      for (const d of detalles) {
        await client.query(
          `INSERT INTO detalle_receta
             (id_receta, id_medicamento, dosis, frecuencia, via_administracion, duracion_tratamiento, cantidad_prescrita, indicaciones)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, d.idMedicamento, d.dosis, d.frecuencia, d.viaAdministracion, d.duracionTratamiento, d.cantidadPrescrita, d.indicaciones]
        );
      }
    }

    await client.query('COMMIT');
    return getRecetaById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function changeEstado(id, estado) {
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw httpError(400, `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`);
  }
  const result = await db.query(
    'UPDATE receta_medica SET estado = $1 WHERE id_receta = $2 RETURNING id_receta',
    [estado, id]
  );
  if (result.rows.length === 0) return null;
  return getRecetaById(id);
}

async function deleteReceta(id) {
  const result = await db.query('DELETE FROM receta_medica WHERE id_receta = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = {
  listRecetas,
  getRecetaById,
  getRecetasByCliente,
  getRecetasVigentes,
  createReceta,
  updateReceta,
  changeEstado,
  deleteReceta,
};
