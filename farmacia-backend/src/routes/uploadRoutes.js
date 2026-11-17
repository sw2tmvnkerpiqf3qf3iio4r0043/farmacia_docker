const { Router } = require('express');
const upload = require('../middleware/upload');
const path = require('path');

const router = Router();

// Endpoint para subir imagen de medicamento
router.post('/medicamento', upload.single('imagen'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    // Construir URL completa (ajusta el puerto si es necesario)
    const imageUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      url: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
});

module.exports = router;