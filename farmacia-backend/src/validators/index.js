const { body, param, query } = require('express-validator');

const authValidators = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  ],
  login: [
    body('email').trim().notEmpty().withMessage('El email es requerido'),
    body('password').trim().notEmpty().withMessage('La contraseña es requerida'),
  ],
  updateProfile: [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
  ],
  changePassword: [
    body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida'),
    body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  ],
};

const medicamentoValidators = {
  create: [
    body('codigoBarras').optional().trim(),
    body('nombreComercial').trim().notEmpty().withMessage('El nombre comercial es requerido'),
    body('nombreGenerico').optional().trim(),
    body('idCategoria').optional().isInt().withMessage('La categoría debe ser un número entero'),
    body('tipoProducto').optional().trim(),
    body('presentacion').optional().trim(),
    body('precioCompra').optional().isFloat({ min: 0 }).withMessage('El precio de compra debe ser un número positivo'),
    body('precioVenta').optional().isFloat({ min: 0 }).withMessage('El precio de venta debe ser un número positivo'),
    body('stock').optional().isInt({ min: 0 }).withMessage('El stock debe ser un número entero positivo'),
    body('requiereReceta').optional().isIn([true, false, 'true', 'false', 0, 1, "0", "1"]),
    body('activo').optional().isIn([true, false, 'true', 'false', 0, 1, "0", "1"]),
    body('imagen').optional(),
  ],
  update: [
    param('id').isInt().withMessage('El ID del medicamento debe ser entero'),
    body('codigoBarras').optional().trim(),
    body('nombreComercial').optional().trim().notEmpty(),
    body('nombreGenerico').optional().trim(),
    body('idCategoria').optional().isInt(),
    body('tipoProducto').optional().trim(),
    body('presentacion').optional().trim(),
    body('precioCompra').optional().isFloat({ min: 0 }),
    body('precioVenta').optional().isFloat({ min: 0 }),
    body('stock').optional().isInt({ min: 0 }),
    body('requiereReceta').optional().isIn([true, false, 'true', 'false', 0, 1, "0", "1"]),
    body('activo').optional().isIn([true, false, 'true', 'false', 0, 1, "0", "1"]),
    body('imagen').optional(),
  ],
  id: [
    param('id').isInt().withMessage('El ID debe ser un número entero')
  ],
  asignarOferta: [
    param('id').isInt().withMessage('El ID del medicamento debe ser entero'),
    body('idOferta').isInt().withMessage('El ID de la oferta es requerido y debe ser entero'),
  ],
  actualizarStock: [
    param('id').isInt().withMessage('El ID del medicamento debe ser entero'),
    body('cantidad').isInt({ min: 1 }).withMessage('La cantidad debe ser un número entero mayor a 0'),
    body('operacion').isIn(['sumar', 'restar']).withMessage('La operación debe ser "sumar" o "restar"'),
  ],
  buscar: [
    query('nombre').trim().notEmpty().withMessage('El parámetro "nombre" es requerido para la búsqueda'),
  ]
};

const ofertaValidators = {
  create: [
    body('nombreOferta').trim().notEmpty().withMessage('El nombre de la oferta es requerido'),
    body('descripcion').optional().trim(),
    body('porcentajeDescuento').isFloat({ min: 0, max: 100 }).withMessage('El descuento debe estar entre 0 y 100'),
    body('fechaInicio').custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error('Fecha de inicio inválida');
      return true;
    }),
    body('fechaFin').custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error('Fecha de fin inválida');
      return true;
    }),
    body('activo').optional().isIn([0, 1, true, false, "0", "1", "true", "false"]),
  ],
  update: [
    param('id').isInt().withMessage('El ID de la oferta debe ser entero'),
    body('nombreOferta').optional().trim().notEmpty(),
    body('descripcion').optional().trim(),
    body('porcentajeDescuento').optional().isFloat({ min: 0, max: 100 }),
    body('fechaInicio').optional().custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error('Fecha de inicio inválida');
      return true;
    }),
    body('fechaFin').optional().custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error('Fecha de fin inválida');
      return true;
    }),
    body('activo').optional().isIn([0, 1, true, false, "0", "1", "true", "false"]),
  ],
  id: [
    param('id').isInt().withMessage('El ID de la oferta debe ser entero')
  ]
};

const ofertaMedicamentoValidators = {
  id: [
    param('id').isInt().withMessage('El ID de la oferta debe ser un número entero')
  ],
  asignar: [
    param('id').isInt().withMessage('El ID de la oferta debe ser entero'),
    body('idMedicamento').isInt().withMessage('El ID del medicamento es requerido y debe ser entero'),
  ],
  eliminar: [
    param('id').isInt().withMessage('El ID de la oferta debe ser entero'),
    param('idMedicamento').isInt().withMessage('El ID del medicamento debe ser entero'),
  ]
};

const categoriaValidators = {
  create: [
    body('nombre').trim().notEmpty().withMessage('El nombre de la categoría es requerido'),
    body('descripcion').optional().trim(),
    body('tipo_categoria').optional().trim(),
    body('tipo_enfermedad').optional().trim(),
    body('id_categoria_padre').optional().isInt().withMessage('El ID de la categoría padre debe ser entero'),
  ],
  update: [
    param('id').isInt().withMessage('El ID de la categoría debe ser entero'),
    body('nombre').optional().trim().notEmpty(),
    body('descripcion').optional().trim(),
    body('tipo_categoria').optional().trim(),
    body('tipo_enfermedad').optional().trim(),
    body('id_categoria_padre').optional().isInt(),
  ],
  id: [
    param('id').isInt().withMessage('El ID de la categoría debe ser entero')
  ]
};

const esFechaValida = (value) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new Error('Fecha inválida');
  return true;
};

const BOOLEANOS = [true, false, 'true', 'false', 0, 1, '0', '1'];
const ESTADOS_LOTE = ['activo', 'agotado', 'cuarentena', 'vencido', 'devuelto'];
const ESTADOS_COMPRA = ['pendiente', 'completada', 'devuelta_parcial', 'devuelta_total'];
const ESTADOS_RECETA = ['vigente', 'usada', 'vencida', 'anulada'];
const ESTADOS_VENTA = ['pendiente', 'completada', 'anulada', 'devuelta_parcial', 'devuelta_total'];
const ESTADOS_PAGO = ['pendiente', 'confirmado', 'anulado'];
const GRAVEDADES = ['leve', 'moderada', 'grave'];
const ROLES_USUARIO = ['Administrador', 'Regente', 'Vendedor', 'Almacenero'];

const ubicacionValidators = {
  create: [
    body('idSucursal').isInt().withMessage('El ID de la sucursal es requerido y debe ser entero'),
    body('nombre').trim().notEmpty().withMessage('El nombre de la ubicación es requerido'),
    body('pasillo').optional().trim(),
    body('estante').optional().trim(),
    body('temperaturaRecomendada').optional().trim(),
    body('activa').optional().isIn(BOOLEANOS),
  ],
  update: [
    param('id').isInt().withMessage('El ID de la ubicación debe ser entero'),
    body('idSucursal').optional().isInt().withMessage('El ID de la sucursal debe ser entero'),
    body('nombre').optional().trim().notEmpty(),
    body('pasillo').optional().trim(),
    body('estante').optional().trim(),
    body('temperaturaRecomendada').optional().trim(),
    body('activa').optional().isIn(BOOLEANOS),
  ],
  id: [
    param('id').isInt().withMessage('El ID de la ubicación debe ser entero'),
  ],
};

const loteValidators = {
  create: [
    body('idMedicamento').isInt().withMessage('El ID del medicamento es requerido y debe ser entero'),
    body('idProveedor').optional({ nullable: true }).isInt().withMessage('El ID del proveedor debe ser entero'),
    body('numeroLote').trim().notEmpty().withMessage('El número de lote es requerido'),
    body('fechaFabricacion').custom(esFechaValida),
    body('fechaVencimiento').custom(esFechaValida),
    body('cantidadInicial').isInt({ min: 1 }).withMessage('La cantidad inicial debe ser un entero mayor a 0'),
    body('estado').optional().isIn(ESTADOS_LOTE),
    body('observaciones').optional().trim(),
  ],
  update: [
    param('id').isInt().withMessage('El ID del lote debe ser entero'),
    body('idMedicamento').optional().isInt(),
    body('idProveedor').optional({ nullable: true }).isInt(),
    body('numeroLote').optional().trim().notEmpty(),
    body('fechaFabricacion').optional().custom(esFechaValida),
    body('fechaVencimiento').optional().custom(esFechaValida),
    body('cantidadInicial').optional().isInt({ min: 1 }),
    body('estado').optional().isIn(ESTADOS_LOTE),
    body('observaciones').optional().trim(),
  ],
  changeEstado: [
    param('id').isInt().withMessage('El ID del lote debe ser entero'),
    body('estado').isIn(ESTADOS_LOTE).withMessage(`El estado debe ser uno de: ${ESTADOS_LOTE.join(', ')}`),
  ],
  id: [
    param('id').isInt().withMessage('El ID del lote debe ser entero'),
  ],
  idMedicamento: [
    param('idMedicamento').isInt().withMessage('El ID del medicamento debe ser entero'),
  ],
};

const inventarioValidators = {
  create: [
    body('idLote').isInt().withMessage('El ID del lote es requerido y debe ser entero'),
    body('idUbicacion').isInt().withMessage('El ID de la ubicación es requerido y debe ser entero'),
    body('cantidadActual').optional().isInt({ min: 0 }),
    body('stockMinimo').optional().isInt({ min: 0 }),
    body('stockMaximo').optional({ nullable: true }).isInt({ min: 0 }),
  ],
  update: [
    param('id').isInt().withMessage('El ID del inventario debe ser entero'),
    body('idLote').optional().isInt(),
    body('idUbicacion').optional().isInt(),
    body('cantidadActual').optional().isInt({ min: 0 }),
    body('stockMinimo').optional().isInt({ min: 0 }),
    body('stockMaximo').optional({ nullable: true }).isInt({ min: 0 }),
  ],
  id: [
    param('id').isInt().withMessage('El ID del inventario debe ser entero'),
  ],
  idLote: [
    param('idLote').isInt().withMessage('El ID del lote debe ser entero'),
  ],
  idUbicacion: [
    param('idUbicacion').isInt().withMessage('El ID de la ubicación debe ser entero'),
  ],
};

const clienteValidators = {
  create: [
    body('ci').trim().notEmpty().withMessage('El CI es requerido'),
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
    body('telefono').trim().notEmpty().withMessage('El teléfono es requerido'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('El email es inválido'),
    body('fechaNacimiento').optional({ nullable: true, checkFalsy: true }).custom(esFechaValida).withMessage('La fecha de nacimiento es inválida'),
    body('condicionesCronicas').optional({ nullable: true }).trim(),
    body('esLocal').optional().isIn(BOOLEANOS),
    body('activo').optional().isIn(BOOLEANOS),
  ],
  update: [
    param('id').isInt().withMessage('El ID del cliente debe ser entero'),
    body('ci').optional().trim().notEmpty(),
    body('nombre').optional().trim().notEmpty(),
    body('telefono').optional().trim().notEmpty(),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail(),
    body('fechaNacimiento').optional({ nullable: true, checkFalsy: true }).custom(esFechaValida),
    body('condicionesCronicas').optional({ nullable: true }).trim(),
    body('esLocal').optional().isIn(BOOLEANOS),
    body('activo').optional().isIn(BOOLEANOS),
  ],
  id: [
    param('id').isInt().withMessage('El ID del cliente debe ser entero'),
  ],
};

const usuarioValidators = {
  create: [
    body('email').isEmail().normalizeEmail().withMessage('El email es inválido'),
    body('name').trim().notEmpty().withMessage('El nombre es requerido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('role').optional().isIn(ROLES_USUARIO).withMessage(`El rol debe ser uno de: ${ROLES_USUARIO.join(', ')}`),
    body('idCliente').optional({ nullable: true }).isInt().withMessage('El ID del cliente debe ser entero'),
    body('activo').optional().isIn(BOOLEANOS),
  ],
  update: [
    param('id').isInt().withMessage('El ID del usuario debe ser entero'),
    body('email').optional().isEmail().normalizeEmail(),
    body('name').optional().trim().notEmpty(),
    body('password').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('role').optional().isIn(ROLES_USUARIO).withMessage(`El rol debe ser uno de: ${ROLES_USUARIO.join(', ')}`),
    body('idCliente').optional({ nullable: true }).isInt(),
    body('activo').optional().isIn(BOOLEANOS),
  ],
  id: [
    param('id').isInt().withMessage('El ID del usuario debe ser entero'),
  ],
};

const proveedorValidators = {
  create: [
    body('nombreEmpresa').trim().notEmpty().withMessage('El nombre de la empresa es requerido'),
    body('contactoNombre').trim().notEmpty().withMessage('El nombre de contacto es requerido'),
    body('contactoTelefono').trim().notEmpty().withMessage('El teléfono de contacto es requerido'),
    body('contactoEmail').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('El email de contacto es inválido'),
    body('aceptaDevoluciones').optional().isIn(BOOLEANOS),
    body('frecuenciaVisita').optional().trim(),
    body('activo').optional().isIn(BOOLEANOS),
  ],
  update: [
    param('id').isInt().withMessage('El ID del proveedor debe ser entero'),
    body('nombreEmpresa').optional().trim().notEmpty(),
    body('contactoNombre').optional().trim().notEmpty(),
    body('contactoTelefono').optional().trim().notEmpty(),
    body('contactoEmail').optional({ nullable: true, checkFalsy: true }).isEmail(),
    body('aceptaDevoluciones').optional().isIn(BOOLEANOS),
    body('frecuenciaVisita').optional().trim(),
    body('activo').optional().isIn(BOOLEANOS),
  ],
  id: [
    param('id').isInt().withMessage('El ID del proveedor debe ser entero'),
  ],
};

const compraValidators = {
  create: [
    body('idProveedor').isInt().withMessage('El ID del proveedor es requerido y debe ser entero'),
    body('numeroFactura').trim().notEmpty().withMessage('El número de factura es requerido'),
    body('fechaCompra').optional().custom(esFechaValida),
    body('estado').optional().isIn(ESTADOS_COMPRA),
    body('observaciones').optional().trim(),
    body('idUbicacion').optional().isInt(),
    body('detalles').isArray({ min: 1 }).withMessage('La compra debe incluir al menos un detalle'),
    body('detalles.*.idMedicamento').isInt().withMessage('Cada detalle requiere un medicamento'),
    body('detalles.*.idLote').optional({ nullable: true }).isInt(),
    body('detalles.*.cantidad').isInt({ min: 1 }).withMessage('La cantidad de cada detalle debe ser mayor a 0'),
    body('detalles.*.precioUnitario').isFloat({ min: 0 }).withMessage('El precio unitario debe ser positivo'),
  ],
  update: [
    param('id').isInt().withMessage('El ID de la compra debe ser entero'),
    body('idProveedor').optional().isInt(),
    body('numeroFactura').optional().trim().notEmpty(),
    body('fechaCompra').optional().custom(esFechaValida),
    body('estado').optional().isIn(ESTADOS_COMPRA),
    body('observaciones').optional().trim(),
    body('detalles').optional().isArray({ min: 1 }),
    body('detalles.*.idMedicamento').optional().isInt(),
    body('detalles.*.idLote').optional({ nullable: true }).isInt(),
    body('detalles.*.cantidad').optional().isInt({ min: 1 }),
    body('detalles.*.precioUnitario').optional().isFloat({ min: 0 }),
  ],
  changeEstado: [
    param('id').isInt().withMessage('El ID de la compra debe ser entero'),
    body('estado').isIn(ESTADOS_COMPRA).withMessage(`El estado debe ser uno de: ${ESTADOS_COMPRA.join(', ')}`),
    body('idUbicacion').optional().isInt(),
  ],
  id: [
    param('id').isInt().withMessage('El ID de la compra debe ser entero'),
  ],
  idProveedor: [
    param('idProveedor').isInt().withMessage('El ID del proveedor debe ser entero'),
  ],
};

const recetaValidators = {
  create: [
    body('idCliente').isInt().withMessage('El ID del cliente es requerido y debe ser entero'),
    body('numeroReceta').trim().notEmpty().withMessage('El número de receta es requerido'),
    body('medicoPrescriptor').trim().notEmpty().withMessage('El médico prescriptor es requerido'),
    body('fechaEmision').custom(esFechaValida),
    body('fechaVencimiento').custom(esFechaValida),
    body('observacionesReceta').optional().trim(),
    body('estado').optional().isIn(ESTADOS_RECETA),
    body('detalles').isArray({ min: 1 }).withMessage('La receta debe incluir al menos un detalle'),
    body('detalles.*.idMedicamento').optional({ nullable: true }).isInt(),
    body('detalles.*.dosis').trim().notEmpty().withMessage('La dosis es requerida'),
    body('detalles.*.frecuencia').trim().notEmpty().withMessage('La frecuencia es requerida'),
    body('detalles.*.viaAdministracion').trim().notEmpty().withMessage('La vía de administración es requerida'),
    body('detalles.*.duracionTratamiento').trim().notEmpty().withMessage('La duración del tratamiento es requerida'),
    body('detalles.*.cantidadPrescrita').optional().isInt({ min: 1 }),
    body('detalles.*.indicaciones').optional().trim(),
  ],
  update: [
    param('id').isInt().withMessage('El ID de la receta debe ser entero'),
    body('idCliente').optional().isInt(),
    body('numeroReceta').optional().trim().notEmpty(),
    body('medicoPrescriptor').optional().trim().notEmpty(),
    body('fechaEmision').optional().custom(esFechaValida),
    body('fechaVencimiento').optional().custom(esFechaValida),
    body('observacionesReceta').optional().trim(),
    body('estado').optional().isIn(ESTADOS_RECETA),
    body('detalles').optional().isArray({ min: 1 }),
    body('detalles.*.idMedicamento').optional({ nullable: true }).isInt(),
    body('detalles.*.dosis').optional().trim().notEmpty(),
    body('detalles.*.frecuencia').optional().trim().notEmpty(),
    body('detalles.*.viaAdministracion').optional().trim().notEmpty(),
    body('detalles.*.duracionTratamiento').optional().trim().notEmpty(),
    body('detalles.*.cantidadPrescrita').optional().isInt({ min: 1 }),
    body('detalles.*.indicaciones').optional().trim(),
  ],
  changeEstado: [
    param('id').isInt().withMessage('El ID de la receta debe ser entero'),
    body('estado').isIn(ESTADOS_RECETA).withMessage(`El estado debe ser uno de: ${ESTADOS_RECETA.join(', ')}`),
  ],
  id: [
    param('id').isInt().withMessage('El ID de la receta debe ser entero'),
  ],
  idCliente: [
    param('idCliente').isInt().withMessage('El ID del cliente debe ser entero'),
  ],
};

const alergiaValidators = {
  create: [
    body('nombre').trim().notEmpty().withMessage('El nombre de la alergia es requerido'),
    body('descripcion').optional().trim(),
    body('activo').optional().isIn(BOOLEANOS),
  ],
  update: [
    param('id').isInt().withMessage('El ID de la alergia debe ser entero'),
    body('nombre').optional().trim().notEmpty(),
    body('descripcion').optional().trim(),
    body('activo').optional().isIn(BOOLEANOS),
  ],
  id: [
    param('id').isInt().withMessage('El ID de la alergia debe ser entero'),
  ],
  idCliente: [
    param('idCliente').isInt().withMessage('El ID del cliente debe ser entero'),
  ],
  asignar: [
    body('idCliente').isInt().withMessage('El ID del cliente es requerido y debe ser entero'),
    body('idAlergia').isInt().withMessage('El ID de la alergia es requerido y debe ser entero'),
    body('gravedad').optional().isIn(GRAVEDADES),
    body('observacion').optional().trim(),
  ],
  quitar: [
    param('idCliente').isInt().withMessage('El ID del cliente debe ser entero'),
    param('idAlergia').isInt().withMessage('El ID de la alergia debe ser entero'),
  ],
  validar: [
    param('idCliente').isInt().withMessage('El ID del cliente debe ser entero'),
    param('idMedicamento').isInt().withMessage('El ID del medicamento debe ser entero'),
  ],
};

const ventaValidators = {
  create: [
    body('idCliente').optional({ nullable: true }).isInt().withMessage('El ID del cliente debe ser entero'),
    body('idEmpleado').optional({ nullable: true }).isInt().withMessage('El ID del empleado debe ser entero'),
    body('fechaVenta').optional({ nullable: true }).custom(esFechaValida).withMessage('La fecha de venta es inválida'),
    body('observaciones').optional({ nullable: true }).trim(),
    body('estado').optional().isIn(['pendiente', 'completada']).withMessage('El estado inicial debe ser pendiente o completada'),
    body('detalles').isArray({ min: 1 }).withMessage('La venta debe incluir al menos un detalle'),
    body('detalles.*.idMedicamento').isInt().withMessage('El ID del medicamento es requerido y debe ser entero'),
    body('detalles.*.cantidad').isInt({ min: 1 }).withMessage('La cantidad debe ser un entero mayor a 0'),
    body('detalles.*.precioUnitario').optional().isFloat({ min: 0 }).withMessage('El precio unitario debe ser mayor o igual a 0'),
    body('detalles.*.descuento').optional().isFloat({ min: 0 }).withMessage('El descuento debe ser mayor o igual a 0'),
    body('detalles.*.idReceta').optional({ nullable: true }).isInt().withMessage('El ID de la receta debe ser entero'),
    body('detalles.*.recetaPresentada').optional().isBoolean().withMessage('recetaPresentada debe ser booleano'),
    body('pagos').optional().isArray().withMessage('Los pagos deben ser un arreglo'),
    body('pagos.*.idMetodoPago')
      .if((_value, { req }) => Array.isArray(req.body.pagos))
      .isInt().withMessage('El ID del método de pago es requerido y debe ser entero'),
    body('pagos.*.monto')
      .if((_value, { req }) => Array.isArray(req.body.pagos))
      .isFloat({ gt: 0 }).withMessage('El monto del pago debe ser mayor a 0'),
    body('pagos.*.referencia').optional({ nullable: true }).trim(),
    body('pagos.*.estadoPago').optional().isIn(['pendiente', 'confirmado']).withMessage('El estado del pago debe ser pendiente o confirmado'),
  ],
  list: [
    query('estado').optional().isIn(ESTADOS_VENTA).withMessage(`El estado debe ser uno de: ${ESTADOS_VENTA.join(', ')}`),
    query('idCliente').optional().isInt().withMessage('El ID del cliente debe ser entero'),
    query('idEmpleado').optional().isInt().withMessage('El ID del empleado debe ser entero'),
    query('desde').optional().custom(esFechaValida).withMessage('La fecha desde es inválida'),
    query('hasta').optional().custom(esFechaValida).withMessage('La fecha hasta es inválida'),
  ],
  id: [
    param('id').isInt().withMessage('El ID de la venta debe ser entero'),
  ],
  idCliente: [
    param('idCliente').isInt().withMessage('El ID del cliente debe ser entero'),
  ],
  addPago: [
    param('id').isInt().withMessage('El ID de la venta debe ser entero'),
    body('idMetodoPago').isInt().withMessage('El ID del método de pago es requerido y debe ser entero'),
    body('monto').isFloat({ gt: 0 }).withMessage('El monto del pago debe ser mayor a 0'),
    body('referencia').optional({ nullable: true }).trim(),
    body('estadoPago').optional().isIn(['pendiente', 'confirmado']).withMessage('El estado del pago debe ser pendiente o confirmado'),
  ],
  anularPago: [
    param('id').isInt().withMessage('El ID de la venta debe ser entero'),
    param('idPago').isInt().withMessage('El ID del pago debe ser entero'),
  ],
  anular: [
    param('id').isInt().withMessage('El ID de la venta debe ser entero'),
    body('motivo').optional({ nullable: true }).trim(),
    body('idEmpleado').optional({ nullable: true }).isInt().withMessage('El ID del empleado debe ser entero'),
  ],
};

module.exports = { 
  authValidators, 
  medicamentoValidators, 
  ofertaValidators, 
  ofertaMedicamentoValidators,
  categoriaValidators,
  ubicacionValidators,
  loteValidators,
  inventarioValidators,
  clienteValidators,
  usuarioValidators,
  proveedorValidators,
  compraValidators,
  recetaValidators,
  alergiaValidators,
  ventaValidators
};