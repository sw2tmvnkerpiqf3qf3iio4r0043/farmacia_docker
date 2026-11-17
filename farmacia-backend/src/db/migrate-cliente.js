require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function main() {
  const file = path.join(__dirname, 'migrations', '003_usuario_cliente.sql');
  const sql = fs.readFileSync(file, 'utf8');
  const client = await db.pool.connect();

  try {
    await client.query(sql);
    console.log('Migración 003 de usuario-cliente aplicada correctamente.');
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

  const result = await db.query(
    `SELECT u.id_usuario, u.nombre_usuario, u.id_cliente, p.nombre_completo
       FROM usuario u
       LEFT JOIN cliente c ON c.id_cliente = u.id_cliente
       LEFT JOIN persona p ON p.id_persona = c.id_persona
      WHERE LOWER(u.nombre_usuario) = 'cliente@farmacia.com'`
  );
  console.log('Usuario cliente:', result.rows[0] || null);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());
