import { useState } from "react";
import { buildImageUrl } from "../utils/buildImageUrl";

export interface ProductoModalItem {
  [key: string]: unknown;
  idMedicamento?: number | string;
  id_medicamento?: number | string;
  id?: number | string;
  nombreComercial?: string;
  nombre?: string;
  nombreGenerico?: string;
  nombre_generico?: string;
  imagen?: string | null;
  stock?: number | string;
  precioVenta?: number | string;
  precioOriginal?: number | string;
  porcentajeDescuento?: number | string;
  nombreOferta?: string;
  requiereReceta?: boolean | number | string;
  requiere_receta?: boolean | number | string;
  presentacion?: string;
  tipoProducto?: string;
  codigoBarras?: string;
}

interface ProductModalProps {
  producto: ProductoModalItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (producto: ProductoModalItem, cantidad: number) => void;
}

interface ProductModalContentProps {
  producto: ProductoModalItem;
  onClose: () => void;
  onAdd?: (producto: ProductoModalItem, cantidad: number) => void;
}

function ProductModalContent({ producto, onClose, onAdd }: ProductModalContentProps) {
  const [cantidad, setCantidad] = useState(1);

  const stock = Number(producto.stock ?? 0);
  const estadoStock = stock > 10 ? "Disponible" : stock > 5 ? "Pocas unidades" : stock > 0 ? "Últimas unidades" : "Sin stock";
  const colorStock = stock > 10 ? "bg-green-500" : stock > 5 ? "bg-yellow-500" : "bg-red-500";
  const precio = Number(producto.precioVenta ?? 0);
  const precioOriginal = producto.precioOriginal != null ? Number(producto.precioOriginal) : null;
  const porcentaje = producto.porcentajeDescuento != null ? Number(producto.porcentajeDescuento) : null;
  const tieneDescuento = precioOriginal != null && porcentaje != null && porcentaje > 0 && precioOriginal > precio;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Detalle del Producto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition text-3xl">×</button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-100 rounded-xl overflow-hidden h-80 flex items-center justify-center relative">
              {producto.imagen ? (
                <img
                  src={buildImageUrl(producto.imagen)}
                  alt={producto.nombreComercial || producto.nombre || "Producto"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="text-8xl text-gray-300">💊</div>
              )}
              {tieneDescuento && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  -{porcentaje}% {producto.nombreOferta ? `· ${producto.nombreOferta}` : "OFERTA"}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {producto.nombreComercial || producto.nombre || "Medicamento"}
                </h3>
                <p className="text-gray-600">{producto.nombreGenerico || producto.nombre_generico || ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold ${colorStock}`}>
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                  {estadoStock} · {stock} u.
                </div>
                {(producto.requiereReceta || producto.requiere_receta) && (
                  <div className="inline-flex items-center px-3 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold">
                    Requiere receta
                  </div>
                )}
              </div>
              <div className="space-y-2 pt-4 border-t text-sm">
                {producto.presentacion && (
                  <div className="flex justify-between py-1 border-b"><span className="text-gray-600">Presentación:</span><span className="font-semibold text-gray-900">{producto.presentacion}</span></div>
                )}
                {producto.tipoProducto && (
                  <div className="flex justify-between py-1 border-b"><span className="text-gray-600">Tipo:</span><span className="font-semibold text-gray-900">{producto.tipoProducto}</span></div>
                )}
                {producto.codigoBarras && (
                  <div className="flex justify-between py-1 border-b"><span className="text-gray-600">Código:</span><span className="font-semibold text-gray-900 font-mono">{producto.codigoBarras}</span></div>
                )}
              </div>
              <div className="pt-2">
                <p className="text-gray-600 mb-1">Precio:</p>
                {tieneDescuento ? (
                  <div>
                    <p className="text-lg text-gray-400 line-through">Bs. {precioOriginal!.toFixed(2)}</p>
                    <p className="text-4xl font-bold text-red-600">Bs. {precio.toFixed(2)}</p>
                  </div>
                ) : (
                  <p className="text-4xl font-bold text-green-600">Bs. {precio.toFixed(2)}</p>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <label className="text-sm font-semibold text-gray-700">Cantidad</label>
                <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-100">-</button>
                  <span className="px-4 py-2 font-bold text-gray-900">{cantidad}</span>
                  <button type="button" onClick={() => setCantidad((c) => Math.min(stock, c + 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40" disabled={cantidad >= stock}>+</button>
                </div>
              </div>
              <button
                type="button"
                disabled={stock <= 0}
                onClick={() => {
                  if (onAdd) onAdd(producto, cantidad);
                  onClose();
                }}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition shadow-lg hover:shadow-xl mt-2"
              >
                {stock > 0 ? "Agregar al carrito" : "Sin stock"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductModal({ producto, isOpen, onClose, onAdd }: ProductModalProps) {
  if (!isOpen || !producto) return null;
  return <ProductModalContent producto={producto} onClose={onClose} onAdd={onAdd} />;
}

export default ProductModal;
