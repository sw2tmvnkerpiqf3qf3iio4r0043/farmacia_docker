require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const medicamentoRoutes = require('./routes/medicamentoRoutes');
const ofertaRoutes = require('./routes/ofertaRoutes');
const ofertaMedicamentoRoutes = require('./routes/ofertaMedicamentoRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const ubicacionRoutes = require('./routes/ubicacionRoutes');
const loteRoutes = require('./routes/loteRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const proveedorRoutes = require('./routes/proveedorRoutes');
const compraRoutes = require('./routes/compraRoutes');
const recetaRoutes = require('./routes/recetaRoutes');
const alergiaRoutes = require('./routes/alergiaRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const ventaRoutes = require('./routes/ventaRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }, 
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
}));

const corsOptions = {
  origin: [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://localhost:3001',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath, stat) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

const openApiSpec = YAML.load(path.join(__dirname, '../openapi.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'Farmacia API',
  customCss: '.swagger-ui .topbar { display: none }',
}));
app.get('/api/docs/openapi.yaml', (_req, res) => {
  res.sendFile(path.join(__dirname, '../openapi.yaml'));
});

app.use('/api/auth', authRoutes);
app.use('/api/categoria', categoriaRoutes);
app.use('/api/medicamento', medicamentoRoutes);
app.use('/api/oferta', ofertaRoutes);
app.use('/api/oferta', ofertaMedicamentoRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ubicacion', ubicacionRoutes);
app.use('/api/lote', loteRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/proveedor', proveedorRoutes);
app.use('/api/compra', compraRoutes);
app.use('/api/receta', recetaRoutes);
app.use('/api/alergia', alergiaRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/venta', ventaRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;