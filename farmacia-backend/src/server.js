const app = require('./app');
const { runProductionMigrations } = require('./db/migrate-production');

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const MAX_INTENTOS = 10;
const ESPERA_REINTENTO_MS = 2000;

async function aplicarMigraciones() {
  for (let intento = 1; intento <= MAX_INTENTOS; intento += 1) {
    try {
      await runProductionMigrations();
      return;
    } catch (err) {
      console.error(`[migrate-production] Intento ${intento}/${MAX_INTENTOS} fallido: ${err.message}`);
      if (intento === MAX_INTENTOS) throw err;
      await new Promise((resolve) => setTimeout(resolve, ESPERA_REINTENTO_MS));
    }
  }
}

async function iniciarServidor() {
  await aplicarMigraciones();

  app.listen(PORT, HOST, () => {
    console.log(`Farmacia API corriendo en http://localhost:${PORT}`);
    console.log(`Escuchando en ${HOST}:${PORT}`);
    console.log(`Documentación OpenAPI: http://localhost:${PORT}/api/docs`);
  });
}

iniciarServidor().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
});
