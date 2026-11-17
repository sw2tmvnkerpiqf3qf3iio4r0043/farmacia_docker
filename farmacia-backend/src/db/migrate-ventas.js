require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function main() {
  const file = path.join(__dirname, 'migrations', '002_ventas_incremental.sql');
  const sql = fs.readFileSync(file, 'utf8');
  const client = await db.pool.connect();

  try {
    await client.query(sql);
    console.log('Migración 002 de ventas aplicada correctamente.');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // La transacción pudo haber quedado cerrada por el error original.
    }
    throw err;
  } finally {
    client.release();
  }

  const tables = await db.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('venta', 'detalle_venta', 'pago', 'metodo_pago')
      ORDER BY table_name`
  );
  console.log('Tablas:', tables.rows.map((row) => row.table_name).join(', '));

  const stock = await db.query(
    'SELECT id_medicamento, stock FROM medicamento ORDER BY id_medicamento'
  );
  console.log('Stock sincronizado:', stock.rows);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());
