const db = require('../db/db');
const ventaService = require('../services/ventaService');

function belongsToUser(req, idCliente) {
  if (!req.user) return false;
  if (req.user.role !== 'user') return true;
  if (!req.user.idCliente || idCliente === null || idCliente === undefined) return false;
  return Number(req.user.idCliente) === Number(idCliente);
}

async function list(req, res, next) {
  try {
    const ventas = await ventaService.listVentas(req.query);
    res.json(ventas);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const venta = await ventaService.getVentaById(req.params.id);
    if (!venta) {
      return res.status(404).json({ error: 'NotFound', message: 'Venta no encontrada' });
    }
    if (!belongsToUser(req, venta.idCliente)) {
      return res.status(403).json({ error: 'Forbidden', message: 'No puedes consultar esta venta' });
    }
    res.json(venta);
  } catch (err) {
    next(err);
  }
}

async function getByCliente(req, res, next) {
  try {
    if (!belongsToUser(req, req.params.idCliente)) {
      return res.status(403).json({ error: 'Forbidden', message: 'No puedes consultar las ventas de otro cliente' });
    }
    const ventas = await ventaService.getVentasByCliente(req.params.idCliente);
    res.json(ventas);
  } catch (err) {
    next(err);
  }
}

async function getComprobante(req, res, next) {
  try {
    const comprobante = await ventaService.getComprobante(req.params.id);
    if (!comprobante) {
      return res.status(404).json({ error: 'NotFound', message: 'Venta no encontrada' });
    }
    if (!belongsToUser(req, comprobante.cliente?.idCliente)) {
      return res.status(403).json({ error: 'Forbidden', message: 'No puedes consultar este comprobante' });
    }
    res.json(comprobante);
  } catch (err) {
    next(err);
  }
}

async function getMetodosPago(_req, res, next) {
  try {
    const metodos = await ventaService.getMetodosPago();
    res.json(metodos);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = { ...req.body };

    if (req.user.role === 'user') {
      if (!req.user.idCliente) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'El usuario no está vinculado a un cliente',
        });
      }
      data.idCliente = req.user.idCliente;
      data.estado = 'completada';
    }

    const venta = await ventaService.crearVenta(req.user.id, data);
    res.status(201).json(venta);
  } catch (err) {
    next(err);
  }
}

async function addPago(req, res, next) {
  try {
    const venta = await ventaService.registrarPago(req.params.id, req.body);
    if (!venta) {
      return res.status(404).json({ error: 'NotFound', message: 'Venta no encontrada' });
    }
    res.status(201).json(venta);
  } catch (err) {
    next(err);
  }
}

async function anularPago(req, res, next) {
  try {
    const venta = await ventaService.anularPago(req.params.id, req.params.idPago);
    if (!venta) {
      return res.status(404).json({ error: 'NotFound', message: 'Venta no encontrada' });
    }
    res.json(venta);
  } catch (err) {
    next(err);
  }
}

async function anular(req, res, next) {
  try {
    const venta = await ventaService.anularVenta(req.params.id, req.user.id, req.body);
    if (!venta) {
      return res.status(404).json({ error: 'NotFound', message: 'Venta no encontrada' });
    }
    res.json(venta);
  } catch (err) {
    next(err);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const venta = await ventaService.cambiarEstado(req.params.id, req.body.estado);
    if (!venta) {
      return res.status(404).json({ error: 'NotFound', message: 'Venta no encontrada' });
    }
    res.json(venta);
  } catch (err) {
    next(err);
  }
}

// ✅ CORRECCIÓN: getMisCompras calcula el total sumando los subtotales
async function getMisCompras(req, res, next) {
  try {
    const idUsuario = req.user?.id;
    
    if (!idUsuario) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const usuarioResult = await db.query(
      'SELECT id_cliente FROM usuario WHERE id_usuario = $1',
      [idUsuario]
    );

    const idCliente = usuarioResult.rows[0]?.id_cliente;
    
    if (!idCliente) {
      return res.status(400).json({ 
        message: 'Usuario no vinculado a un cliente' 
      });
    }

    const query = `
      SELECT 
        v.id_venta as "idVenta", 
        v.fecha_venta as "fechaVenta", 
        COALESCE(SUM(dv.subtotal), 0) as "totalVenta", 
        v.estado,
        json_agg(json_build_object(
          'nombre', m.nombre_comercial,
          'cantidad', dv.cantidad,
          'precio_unitario', dv.precio_unitario,
          'subtotal', dv.subtotal
        )) as detalles
      FROM venta v
      JOIN detalle_venta dv ON v.id_venta = dv.id_venta
      JOIN medicamento m ON dv.id_medicamento = m.id_medicamento
      WHERE v.id_cliente = $1
      GROUP BY v.id_venta, v.fecha_venta, v.estado
      ORDER BY v.fecha_venta DESC
    `;
    
    const result = await db.query(query, [idCliente]);
    
    // ✅ Convertir el total a número para que la app lo muestre bien
    const ventasFormateadas = result.rows.map(row => ({
      ...row,
      totalVenta: Number(row.totalVenta) || 0
    }));
    
    res.json(ventasFormateadas);
  } catch (err) {
    console.error('Error en getMisCompras:', err);
    next(err);
  }
}

module.exports = {
  list,
  getById,
  getByCliente,
  getComprobante,
  getMetodosPago,
  create,
  addPago,
  anularPago,
  anular,
  cambiarEstado,
  getMisCompras,
};
