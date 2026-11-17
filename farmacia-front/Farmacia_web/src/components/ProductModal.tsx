import { useEffect, useState } from "react";

interface ProductModalProps {
  producto: any;
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (producto: any, cantidad: number) => void;
}

function ProductModal({ producto, isOpen, onClose, onAdd }: ProductModalProps) {
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    setCantidad(1);
  }, [producto]);

  if (!isOpen || !producto) return null;

  const stock = producto.stock || 0;
  const estadoStock = stock > 10 ? 'Disponible' : stock > 5 ? 'Pocas unidades' : 'Últimas unidades';
  const colorStock = stock > 10 ? 'bg-green-500' : stock > 5 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Detalle del Producto</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-3xl"
          >
            ×
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Imagen */}
            <div className="bg-gray-100 rounded-xl overflow-hidden h-80 flex items-center justify-center">
              {producto.imagen ? (
                <img 
                  src={producto.imagen} 
                  alt={producto.nombreComercial}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-8xl text-gray-300">💊</div>
              )}
            </div>

            {/* Información */}
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {producto.nombreComercial}
                </h3>
                <p className="text-gray-600">{producto.nombreGenerico}</p>
              </div>

              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold ${colorStock}`}>
                <span className="w-2 h-2 bg-white rounded-full"></span>
                {estadoStock} - {stock} unidades disponibles
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Presentación:</span>
                  <span className="font-semibold text-gray-900">{producto.presentacion || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-semibold text-gray-900">{producto.tipoProducto || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Código:</span>
                  <span className="font-semibold text-gray-900 font-mono">{producto.codigoBarras}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Requiere receta:</span>
                  <span className="font-semibold text-gray-900">
                    {producto.requiereReceta ? '✅ Sí' : '❌ No'}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-gray-600 mb-2">Precio:</p>
                <p className="text-4xl font-bold text-green-600">
                  Bs. {Number(producto.precioVenta).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Precio de compra: Bs. {Number(producto.precioCompra).toFixed(2)}
                </p>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <label className="text-sm font-semibold text-gray-700">Cantidad</label>
                <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 font-bold text-gray-900">{cantidad}</span>
                  <button
                    type="button"
                    onClick={() => setCantidad((c) => Math.min(stock, c + 1))}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                    disabled={cantidad >= stock}
                  >
                    +
                  </button>
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
                {stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductModal;