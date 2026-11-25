const { Router } = require('express');
const upload = require('../middleware/upload');

const router = Router();

function responderArchivo(req, res) {
  const archivo = req.file || Object.values(req.files || {}).reduce((todos, grupos) => todos.concat(grupos), [])[0];

  if (!archivo) {
    return res.status(400).json({ error: 'ValidationError', message: 'No se subió ningún archivo' });
  }

  return res.json({
    success: true,
    url: `/uploads/${archivo.filename}`,
    filename: archivo.filename,
    originalName: archivo.originalname,
  });
}

function handleUploadError(err, _req, res, next) {
  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen no debe superar 5MB'
      : err.message;
    return res.status(400).json({ error: 'ValidationError', message });
  }

  if (err) {
    return res.status(400).json({ error: 'ValidationError', message: err.message || 'Error al subir la imagen' });
  }

  next();
}

router.post('/medicamento', upload.single('imagen'), responderArchivo);
router.post('/', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'imagen', maxCount: 1 },
  { name: 'receta', maxCount: 1 },
]), responderArchivo);

router.use(handleUploadError);

module.exports = router;
