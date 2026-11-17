const db = require('../db/db.js');

async function asignarMedicamento(userId, idOferta, idMedicamento) {
  const checkQuery = 'SELECT * FROM oferta_medicamento WHERE id_oferta = $1 AND id_medicamento = $2';
  const checkResult = await db.query(checkQuery, [idOferta, idMedicamento]);
  if (checkResult.rows.length > 0) throw new Error('Este medicamento ya está asignado a esta oferta');

  const queryText = `
    INSERT INTO oferta_medicamento (id_oferta, id_medicamento, fecha_asignacion)
    VALUES ($1, $2, NOW()) RETURNING *;
  `;
  const result = await db.query(queryText, [idOferta, idMedicamento]);
  return result.rows[0];
}

async function eliminarRelacion(idOferta, idMedicamento) {
  const query = 'DELETE FROM oferta_medicamento WHERE id_oferta = $1 AND id_medicamento = $2 RETURNING *';
  const result = await db.query(query, [idOferta, idMedicamento]);
  return result.rows[0];
}

async function getMedicamentosDeOferta(idOferta) {
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
      o.fecha_fin AS "vencimientoOferta",
      om.fecha_asignacion AS "fechaAsignacion"
    FROM medicamento m
    INNER JOIN oferta_medicamento om ON m.id_medicamento = om.id_medicamento
    INNER JOIN oferta o ON om.id_oferta = o.id_oferta
    WHERE o.id_oferta = $1
    ORDER BY m.nombre_comercial ASC
  `;
  const result = await db.query(query, [idOferta]);
  return result.rows;
}

async function getOfertasActivasConProductos() {
  const query = `
    SELECT 
      o.id_oferta AS "idOferta",
      o.nombre_oferta AS "nombreOferta",
      o.descripcion,
      o.porcentaje_descuento AS "porcentajeDescuento",
      o.fecha_inicio AS "fechaInicio",
      o.fecha_fin AS "fechaFin",
      COALESCE(
        json_agg(
          json_build_object(
            'idMedicamento', m.id_medicamento,
            'codigoBarras', m.codigo_barras,
            'nombreComercial', m.nombre_comercial,
            'nombreGenerico', m.nombre_generico,
            'presentacion', m.presentacion,
            'precioOriginal', m.precio_venta,
            'precioConDescuento', ROUND(m.precio_venta * (1 - (o.porcentaje_descuento / 100.0)), 2),
            'stock', m.stock,
            'imagen', m.imagen,
            'activo', m.activo
          ) ORDER BY m.nombre_comercial ASC
        ) FILTER (WHERE m.id_medicamento IS NOT NULL), 
        '[]'::json
      ) AS productos
    FROM oferta o
    LEFT JOIN oferta_medicamento om ON o.id_oferta = om.id_oferta
    LEFT JOIN medicamento m ON om.id_medicamento = m.id_medicamento
    WHERE o.fecha_fin >= CURRENT_DATE
    GROUP BY o.id_oferta, o.nombre_oferta, o.descripcion, o.porcentaje_descuento, o.fecha_inicio, o.fecha_fin
    ORDER BY o.fecha_inicio DESC
  `;
  const result = await db.query(query);
  return result.rows;
}

module.exports = { 
  asignarMedicamento, 
  eliminarRelacion, 
  getMedicamentosDeOferta,
  getOfertasActivasConProductos
};