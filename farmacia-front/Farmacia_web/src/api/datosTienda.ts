export interface RawMedicamento {
  idMedicamento?: number | string;
  id_medicamento?: number | string;
  id?: number | string;
  nombreComercial?: string;
  nombre_comercial?: string;
  nombre?: string;
  nombreGenerico?: string;
  nombre_generico?: string;
  presentacion?: string;
  precioVenta?: number | string;
  precio_venta?: number | string;
  stock?: number | string;
  requiereReceta?: boolean | number | string;
  requiere_receta?: boolean | number | string;
  imagen?: string | null;
  imagen_url?: string | null;
  idCategoria?: number | string;
  id_categoria?: number | string;
}

export interface MedicamentoNormalizado {
  idMedicamento: number;
  nombreComercial: string;
  nombreGenerico: string;
  presentacion: string;
  precioVenta: number;
  stock: number;
  requiereReceta: boolean;
  imagen: string | null;
  idCategoria: number;
}

export interface RawCategoria {
  [key: string]: unknown;
  id_categoria?: number | string;
  idCategoria?: number | string;
  id?: number | string;
  nombre?: string;
  id_categoria_padre?: number | string | null;
  idCategoriaPadre?: number | string | null;
}

export interface CategoriaNormalizada {
  id_categoria: number;
  nombre: string;
  id_categoria_padre: number | null;
}

export interface RawOferta {
  [key: string]: unknown;
  idMedicamento?: number | string;
  id_medicamento?: number | string;
  nombreOferta?: string;
  nombre_oferta?: string;
  precioOriginal?: number | string;
  precio_original?: number | string;
  precioVenta?: number | string;
  porcentajeDescuento?: number | string;
  porcentaje_descuento?: number | string;
  precioConDescuento?: number | string;
  precio_con_descuento?: number | string;
  vencimientoOferta?: string | null;
  vencimiento_oferta?: string | null;
}

export interface OfertaNormalizada {
  idMedicamento: number;
  precioOriginal: number;
  porcentajeDescuento: number;
  precioConDescuento: number;
  nombreOferta: string;
  vencimientoOferta?: string;
}

export function numero(valor: unknown, fallback = 0): number {
  if (valor === undefined || valor === null || valor === "") return fallback;
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : fallback;
}

export function texto(valor: unknown, fallback = ""): string {
  return valor === undefined || valor === null || valor === "" ? fallback : String(valor);
}

export function extraerArreglo<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const objeto = data as { medicamentos?: unknown; data?: unknown; categorias?: unknown };
    for (const valor of [objeto.data, objeto.medicamentos, objeto.categorias]) {
      if (Array.isArray(valor)) return valor as T[];
    }
  }
  return [];
}

export function normalizarMedicamento(raw: RawMedicamento): MedicamentoNormalizado {
  return {
    idMedicamento: numero(raw.idMedicamento ?? raw.id_medicamento ?? raw.id),
    nombreComercial: texto(raw.nombreComercial ?? raw.nombre_comercial ?? raw.nombre, "Medicamento"),
    nombreGenerico: texto(raw.nombreGenerico ?? raw.nombre_generico),
    presentacion: texto(raw.presentacion),
    precioVenta: numero(raw.precioVenta ?? raw.precio_venta),
    stock: numero(raw.stock),
    requiereReceta: Boolean(raw.requiereReceta ?? raw.requiere_receta),
    imagen: texto(raw.imagen ?? raw.imagen_url) || null,
    idCategoria: numero(raw.idCategoria ?? raw.id_categoria),
  };
}

export function normalizarCategoria(raw: RawCategoria): CategoriaNormalizada {
  const padre = raw.id_categoria_padre ?? raw.idCategoriaPadre ?? null;
  return {
    id_categoria: numero(raw.id_categoria ?? raw.idCategoria ?? raw.id),
    nombre: texto(raw.nombre),
    id_categoria_padre: padre === null ? null : numero(padre),
  };
}

export function normalizarOferta(raw: RawOferta): OfertaNormalizada {
  return {
    idMedicamento: numero(raw.idMedicamento ?? raw.id_medicamento),
    precioOriginal: numero(raw.precioOriginal ?? raw.precio_original ?? raw.precioVenta),
    porcentajeDescuento: numero(raw.porcentajeDescuento ?? raw.porcentaje_descuento),
    precioConDescuento: numero(raw.precioConDescuento ?? raw.precio_con_descuento),
    nombreOferta: texto(raw.nombreOferta ?? raw.nombre_oferta, "Oferta"),
    vencimientoOferta: texto(raw.vencimientoOferta ?? raw.vencimiento_oferta) || undefined,
  };
}
