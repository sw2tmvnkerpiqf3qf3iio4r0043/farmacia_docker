import type { ReactNode } from "react";
import { buildImageUrl } from "../utils/buildImageUrl";

interface ProductCardProps {
  nombre: string;
  generico?: string;
  presentacion?: string;
  imagen?: string | null;
  precio: number;
  precioOriginal?: number;
  porcentajeDescuento?: number;
  stock: number;
  requiereReceta?: boolean;
  badgeOferta?: string;
  onClick?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  disabledAdd?: boolean;
  extra?: ReactNode;
}

function ProductCard({
  nombre,
  generico,
  presentacion,
  imagen,
  precio,
  precioOriginal,
  porcentajeDescuento,
  stock,
  requiereReceta,
  badgeOferta,
  onClick,
  onAdd,
  addLabel = "Agregar",
  disabledAdd,
  extra,
}: ProductCardProps) {
  const sinStock = stock <= 0;
  const stockClase = stock > 10 ? "bg-green-500" : stock > 5 ? "bg-yellow-500" : "bg-red-500";
  const tieneDescuento = !!porcentajeDescuento && porcentajeDescuento > 0 && (precioOriginal ?? 0) > precio;

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 group relative overflow-hidden"
    >
      {badgeOferta && (
        <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
          {badgeOferta}
        </div>
      )}
      <div
        className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden cursor-pointer"
        onClick={onClick}
      >
        {imagen ? (
          <img
            src={buildImageUrl(imagen)}
            alt={nombre}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">💊</div>
        )}
        <div className={`absolute top-2 right-2 ${stockClase} text-white text-xs font-bold px-2 py-1 rounded-full`}>
          {stock}
        </div>
        {requiereReceta && (
          <div className="absolute bottom-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Receta
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-2 h-10 cursor-pointer" onClick={onClick}>
          {nombre}
        </h3>
        {generico && <p className="text-xs text-gray-500 mb-1 line-clamp-1">{generico}</p>}
        {presentacion && <p className="text-xs text-gray-600 mb-2">{presentacion}</p>}
        <div className="mt-2">
          {tieneDescuento ? (
            <div className="space-y-0.5">
              <p className="text-xs text-gray-400 line-through">Bs. {precioOriginal!.toFixed(2)}</p>
              <p className="text-lg font-bold text-red-600">Bs. {precio.toFixed(2)}</p>
              <span className="inline-block bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                -{porcentajeDescuento}% OFF
              </span>
            </div>
          ) : (
            <p className="text-lg font-bold text-blue-600">Bs. {precio.toFixed(2)}</p>
          )}
        </div>
        {extra}
        <div className="flex gap-2 mt-3">
          {onClick && (
            <button
              type="button"
              onClick={onClick}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            >
              Ver más
            </button>
          )}
          {onAdd && (
            <button
              type="button"
              disabled={sinStock || disabledAdd}
              onClick={onAdd}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            >
              {sinStock ? "Sin stock" : addLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
