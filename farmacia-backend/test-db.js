const db = require('./src/db/db.js')

async function probarConexion() {
    try {
        console.log('Intentando conectar a la base de datos...');
        
        // 1. Probamos la conexión trayendo el nombre de la base de datos actual
        const resultadoConexion = await db.pool.query('SELECT current_database() AS db_name;');
        console.log('¡CONEXIÓN EXITOSA CON POSTGRESQL! 🚀');
        console.log('Conectado a la base de datos:', resultadoConexion.rows[0].db_name);
        
        // 2. Hacemos una consulta extra para ver las tablas que tienes creadas
        const resultadoTablas = await db.pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `);
        
        console.log('--------------------------------------------------');
        if (resultadoTablas.rows.length > 0) {
            console.log('Tablas encontradas en la base de datos:');
            console.log(resultadoTablas.rows);
        } else {
            console.log('La conexión funciona, pero la base de datos aún no tiene tablas creadas.');
        }
        console.log('--------------------------------------------------');

    } catch (error) {
        console.error('❌ ERROR DETALLADO:', error);
    } finally {
        // Cerramos la conexión para que el script termine correctamente
        await db.pool.end();
    }
}

probarConexion();