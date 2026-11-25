export type UserRole = 'admin' | 'user' | 'regente' | 'vendedor' | 'almacenero';

export interface UserSession {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  idCliente: number | null;
  createdAt?: string;
}

export interface AuthResponse {
  user: UserSession;
  token: string;
}

export interface Cliente {
  idCliente: number;
  idPersona?: number;
  ci: string;
  nombre: string;
  nombreCompleto?: string;
  telefono: string;
  email: string | null;
  fechaNacimiento: string | null;
  condicionesCronicas: string | null;
  esLocal: boolean;
  activo: boolean;
}

export interface MetodoPago {
  idMetodoPago: number;
  nombre: string;
}

export interface Ubicacion {
  idUbicacion: number;
  nombre?: string;
  direccion?: string;
  sucursal?: string | { nombre?: string; [key: string]: unknown };
  nombreSucursal?: string;
  activo?: boolean;
  [key: string]: unknown;
}

export interface Receta {
  idReceta: number;
  numeroReceta?: string | null;
  medicoPrescriptor?: string | null;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  imagenUrl: string;
  observacionesReceta?: string | null;
  [key: string]: unknown;
}

export interface VentaDetalle {
  idDetalleVenta: number;
  idMedicamento: number;
  medicamento: string;
  idLote?: number;
  numeroLote?: string;
  idReceta: number | null;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  recetaPresentada: boolean;
  receta?: Receta | null;
  imagenReceta?: string | null;
}

export interface Pago {
  idPago: number;
  idMetodoPago: number;
  metodoPago: string;
  monto: number;
  referencia: string | null;
  fechaPago: string;
  estadoPago: string;
}

export interface Venta {
  idVenta: number;
  idEmpleado: number | null;
  empleado: string | null;
  idCliente: number | null;
  cliente: string | null;
  idUbicacion?: number | null;
  ubicacion?: string | Ubicacion | null;
  fechaVenta: string;
  totalVenta: number;
  estado: string;
  observaciones: string | null;
  totalPagado: number;
  saldo: number;
  detalles?: VentaDetalle[];
  pagos?: Pago[];
}

export interface CreateVentaPayload {
  idCliente?: number | null;
  idEmpleado?: number | null;
  idUbicacion?: number | null;
  fechaVenta?: string;
  observaciones?: string;
  estado?: 'pendiente' | 'en_camino' | 'completada';
  detalles: {
    idMedicamento: number;
    cantidad: number;
    precioUnitario?: number;
    descuento?: number;
    idReceta?: number;
    recetaPresentada?: boolean;
  }[];
  pagos?: {
    idMetodoPago: number;
    monto: number;
    referencia?: string;
    estadoPago?: 'pendiente' | 'confirmado';
  }[];
}

export interface CompraDetalle {
  idDetalleCompra: number;
  idMedicamento: number;
  medicamento: string;
  idLote: number | null;
  numeroLote: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Compra {
  idCompra: number;
  idProveedor: number;
  proveedor: string;
  numeroFactura: string;
  fechaCompra: string;
  totalCompra: number;
  estado: string;
  observaciones: string | null;
  fechaRegistro: string;
  detalles?: CompraDetalle[];
}

export interface CreateCompraPayload {
  idProveedor: number;
  numeroFactura: string;
  fechaCompra?: string;
  estado?: 'pendiente' | 'completada';
  observaciones?: string;
  idUbicacion?: number;
  detalles: {
    idMedicamento: number;
    idLote?: number | null;
    nuevoLote?: {
      idProveedor?: number | null;
      numeroLote: string;
      fechaFabricacion: string;
      fechaVencimiento: string;
      observaciones?: string;
    } | null;
    cantidad: number;
    precioUnitario: number;
  }[];
}

export interface Proveedor {
  idProveedor: number;
  nombreEmpresa: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string | null;
  activo: boolean;
}

export interface Lote {
  idLote: number;
  idMedicamento: number;
  medicamento: string;
  idProveedor: number | null;
  numeroLote: string;
  fechaFabricacion: string;
  fechaVencimiento: string;
  cantidadInicial: number;
  estado: string;
}

export interface CreateLotePayload {
  idMedicamento: number;
  idProveedor?: number | null;
  numeroLote: string;
  fechaFabricacion: string;
  fechaVencimiento: string;
  cantidadInicial: number;
  estado?: string;
  observaciones?: string;
}

export interface CartItem {
  idMedicamento: number;
  nombreComercial: string;
  nombreGenerico: string;
  precioVenta: number;
  cantidad: number;
  stock: number;
  requiereReceta: boolean;
  imagen?: string;
  precioOriginal?: number;
  porcentajeDescuento?: number;
  descuento?: number;
  nombreOferta?: string;
  presentacion?: string;
}
