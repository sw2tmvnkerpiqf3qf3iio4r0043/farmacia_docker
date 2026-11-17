const app = require('./app');

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Farmacia API corriendo en http://localhost:${PORT}`);
  console.log(`Disponible en red: http://192.168.0.106:${PORT}`);
  console.log(`Documentación OpenAPI: http://localhost:${PORT}/api/docs`);
});