const db = require('./db');

async function hasColumn(tableName, columnName) {
  const result = await db.pool.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_name = $1
        AND column_name = $2
        AND table_schema = ANY(current_schemas(false))
      LIMIT 1`,
    [tableName, columnName]
  );
  return result.rows.length > 0;
}

async function runProductionMigrations() {
  console.log('[migrate-production] Iniciando migraciones de producción...');

  const teniaImagen = await hasColumn('medicamento', 'imagen');
  const tieneImagenUrl = await hasColumn('medicamento', 'imagen_url');

  await db.pool.query(
    `ALTER TABLE medicamento ADD COLUMN IF NOT EXISTS imagen varchar(500) DEFAULT '/uploads/default.svg'`
  );
  console.log('[migrate-production] Columna medicamento.imagen verificada.');

  if (!teniaImagen && tieneImagenUrl) {
    const copiadas = await db.pool.query(
      'UPDATE medicamento SET imagen = imagen_url WHERE imagen_url IS NOT NULL'
    );
    console.log(`[migrate-production] Valores copiados de imagen_url a imagen: ${copiadas.rowCount}`);
  }

  const normalizadas = await db.pool.query(`
    UPDATE medicamento
       SET imagen = regexp_replace(imagen, '^https?://[^/]+/uploads/', '/uploads/')
     WHERE imagen ~ '^https?://'
  `);
  console.log(`[migrate-production] URLs de imagen normalizadas: ${normalizadas.rowCount}`);

  const defaults = await db.pool.query(`
    UPDATE medicamento
       SET imagen = '/uploads/default.svg'
     WHERE imagen IS NULL OR imagen LIKE 'https://cdn-icons%'
  `);
  console.log(`[migrate-production] Imágenes por defecto aplicadas: ${defaults.rowCount}`);

  await db.pool.query(`
    ALTER TABLE receta_medica ADD COLUMN IF NOT EXISTS imagen_url varchar(500)
  `);
  console.log('[migrate-production] Columna receta_medica.imagen_url verificada.');

  await db.pool.query(`
    ALTER TABLE venta ADD COLUMN IF NOT EXISTS id_ubicacion integer
      REFERENCES ubicacion_inventario(id_ubicacion) ON DELETE SET NULL
  `);
  console.log('[migrate-production] Columna venta.id_ubicacion verificada.');

  await db.pool.query(`
    DO $$
    DECLARE
      v_constraint text;
    BEGIN
      FOR v_constraint IN
        SELECT conname
          FROM pg_constraint
         WHERE conrelid = 'venta'::regclass
           AND contype = 'c'
           AND (conname = 'venta_estado_check' OR pg_get_constraintdef(oid) ILIKE '%estado%')
      LOOP
        EXECUTE format('ALTER TABLE venta DROP CONSTRAINT %I', v_constraint);
      END LOOP;

      EXECUTE 'ALTER TABLE venta ADD CONSTRAINT venta_estado_check CHECK (estado IN (''pendiente'', ''en_camino'', ''completada'', ''anulada'', ''devuelta_parcial'', ''devuelta_total''))';
    END $$;
  `);
  console.log('[migrate-production] CHECK de venta.estado reconstruido con en_camino.');

  const metodoEfectivo = await db.pool.query(`
    INSERT INTO metodo_pago (nombre, activo)
    SELECT 'Efectivo', TRUE
     WHERE NOT EXISTS (SELECT 1 FROM metodo_pago WHERE nombre = 'Efectivo')
  `);
  const metodoQr = await db.pool.query(`
    INSERT INTO metodo_pago (nombre, activo)
    SELECT 'QR', TRUE
     WHERE NOT EXISTS (SELECT 1 FROM metodo_pago WHERE nombre = 'QR')
  `);
  console.log(`[migrate-production] Métodos de pago asegurados: Efectivo=${metodoEfectivo.rowCount}, QR=${metodoQr.rowCount}`);

  console.log('[migrate-production] Migraciones de producción aplicadas correctamente.');
}

module.exports = { runProductionMigrations };
