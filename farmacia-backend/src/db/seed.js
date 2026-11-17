const bcrypt = require('bcryptjs');
const db = require('./db');

const BCRYPT_ROUNDS = 12;

async function seed() {
  const passwordHash = await bcrypt.hash('demo1234', BCRYPT_ROUNDS);

  const existing = await db.query(
    `SELECT id_usuario FROM usuario
      WHERE LOWER(nombre_usuario) IN (LOWER($1), LOWER($2))`,
    ['demo@agenda.com', 'cliente@farmacia.com']
  );

  if (existing.rows.length > 0) {
    console.log('Los usuarios demo ya existen. Saltando seed.');
    return;
  }

  const users = [
    { email: 'demo@agenda.com', name: 'Admin Demo', rol: 'Administrador' },
    { email: 'cliente@farmacia.com', name: 'Cliente Demo', rol: null },
  ];

  for (const user of users) {
    const inserted = await db.query(
      `INSERT INTO usuario (nombre_usuario, nombre, contrasena_hash, activo)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id_usuario`,
      [user.email, user.name, passwordHash]
    );
    const userId = inserted.rows[0].id_usuario;

    if (user.rol) {
      const rol = await db.query(
        'SELECT id_rol FROM rol WHERE nombre = $1 AND activo',
        [user.rol]
      );
      if (rol.rows.length > 0) {
        await db.query(
          'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, rol.rows[0].id_rol]
        );
      }
    }
  }

  console.log('Seed completado: usuarios creados en PostgreSQL (tabla usuario).');
  console.log('Admin: demo@agenda.com / demo1234');
  console.log('Cliente: cliente@farmacia.com / demo1234');
}

seed().catch((err) => {
  console.error('Error ejecutando el seed:', err);
  process.exit(1);
});