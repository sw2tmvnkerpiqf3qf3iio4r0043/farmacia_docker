import type { ChangeEvent, RefObject } from "react";
import { buildImageUrl } from "../utils/buildImageUrl";

export interface MedicamentoFormData {
  codigoBarras: string;
  nombreComercial: string;
  nombreGenerico: string;
  idCategoria: string;
  tipoProducto: string;
  presentacion: string;
  precioCompra: string;
  precioVenta: string;
  stock: string;
  descripcion: string;
  requiereReceta: boolean;
  activo: boolean;
  imagen: string;
}

interface CategoriaOpcion {
  id_categoria: number;
  nombre: string;
}

interface MedicamentoFormProps {
  formData: MedicamentoFormData;
  categorias: CategoriaOpcion[];
  vistaPrevia: string;
  subiendoImagen: boolean;
  onInputChange: (field: keyof MedicamentoFormData, value: string | boolean) => void;
  onSubirImagen: (e: ChangeEvent<HTMLInputElement>) => void;
  onLimpiarImagen: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

const INPUT_CLASS =
  "w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";

const MedicamentoForm = ({
  formData,
  categorias,
  vistaPrevia,
  subiendoImagen,
  onInputChange,
  onSubirImagen,
  onLimpiarImagen,
  fileInputRef,
}: MedicamentoFormProps) => {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Código *
          </label>
          <input
            type="text"
            value={formData.codigoBarras}
            onChange={(e) => onInputChange("codigoBarras", e.target.value)}
            required
            className={INPUT_CLASS}
            placeholder="777-12345"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nombre comercial *
          </label>
          <input
            type="text"
            value={formData.nombreComercial}
            onChange={(e) => onInputChange("nombreComercial", e.target.value)}
            required
            className={INPUT_CLASS}
            placeholder="Paracetamol 500mg"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nombre genérico
          </label>
          <input
            type="text"
            value={formData.nombreGenerico}
            onChange={(e) => onInputChange("nombreGenerico", e.target.value)}
            className={INPUT_CLASS}
            placeholder="Paracetamol"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Categoría *
          </label>
          <select
            value={formData.idCategoria}
            onChange={(e) => onInputChange("idCategoria", e.target.value)}
            required
            className={INPUT_CLASS}
          >
            <option value="">Seleccionar categoría</option>
            {categorias.map((cat) => (
              <option key={cat.id_categoria} value={cat.id_categoria}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Tipo de producto *
          </label>
          <select
            value={formData.tipoProducto}
            onChange={(e) => onInputChange("tipoProducto", e.target.value)}
            required
            className={INPUT_CLASS}
          >
            <option value="">Seleccionar tipo</option>
            <option value="medicamento">Medicamento</option>
            <option value="parafarmacia">Parafarmacia</option>
            <option value="suplemento">Suplemento</option>
            <option value="higiene">Higiene</option>
            <option value="cuidado_personal">Cuidado personal</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Presentación
          </label>
          <input
            type="text"
            value={formData.presentacion}
            onChange={(e) => onInputChange("presentacion", e.target.value)}
            className={INPUT_CLASS}
            placeholder="Caja x 20 tabletas"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Precio compra *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.precioCompra}
            onChange={(e) => onInputChange("precioCompra", e.target.value)}
            required
            className={INPUT_CLASS}
            placeholder="5.00"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Precio venta *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.precioVenta}
            onChange={(e) => onInputChange("precioVenta", e.target.value)}
            required
            className={INPUT_CLASS}
            placeholder="10.00"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Stock *
          </label>
          <input
            type="number"
            min="0"
            value={formData.stock}
            onChange={(e) => onInputChange("stock", e.target.value)}
            required
            className={INPUT_CLASS}
            placeholder="100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Requiere receta
          </label>
          <select
            value={formData.requiereReceta ? "true" : "false"}
            onChange={(e) => onInputChange("requiereReceta", e.target.value === "true")}
            className={INPUT_CLASS}
          >
            <option value="false">No</option>
            <option value="true">Sí</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Activo
          </label>
          <select
            value={formData.activo ? "true" : "false"}
            onChange={(e) => onInputChange("activo", e.target.value === "true")}
            className={INPUT_CLASS}
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => onInputChange("descripcion", e.target.value)}
            rows={3}
            className={INPUT_CLASS}
            placeholder="Indicaciones, composición u observaciones..."
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Imagen del producto
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={onSubirImagen}
          className="hidden"
        />
        <div className="flex flex-col md:flex-row gap-3 md:items-start">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={subiendoImagen}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition"
          >
            {subiendoImagen ? "Subiendo..." : "Subir imagen"}
          </button>
          <div className="flex-1">
            <input
              type="text"
              value={formData.imagen}
              onChange={(e) => onInputChange("imagen", e.target.value)}
              placeholder="O pega una URL, por ejemplo /uploads/producto.png"
              className={INPUT_CLASS}
            />
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG, GIF o WEBP (máx. 5MB). Las URL absolutas de /uploads/ se guardan como ruta relativa.
            </p>
          </div>
        </div>

        {(vistaPrevia || formData.imagen) && (
          <div className="mt-3 relative inline-block">
            <img
              src={buildImageUrl(vistaPrevia || formData.imagen)}
              alt="Vista previa"
              className="h-32 w-32 object-cover rounded-lg border-2 border-gray-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='128' height='128' fill='%23e5e7eb'/%3E%3C/svg%3E";
              }}
            />
            <button
              type="button"
              onClick={onLimpiarImagen}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
              title="Quitar imagen"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </form>
  );
};

export default MedicamentoForm;
