import React from "react";

interface Categoria {
  id_categoria: number;
  nombre: string;
}

interface FormData {
  codigoBarras: string;
  nombreComercial: string;
  nombreGenerico: string;
  presentacion: string;
  precioCompra: string;
  precioVenta: string;
  stock: string;
  requiereReceta: boolean;
  imagen: string;
  idCategoria: string;
}

interface MedicamentoFormProps {
  formData: FormData;
  categorias: Categoria[];
  vistaPrevia: string;
  subiendoImagen: boolean;
  onInputChange: (field: string, value: any) => void;
  onSubirImagen: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLimpiarVistaPrevia: () => void;
  // ✅ AQUÍ ESTÁ LA CORRECCIÓN EXACTA: se agrega "| null"
  fileInputRef: React.RefObject<HTMLInputElement | null>; 
}

const MedicamentoForm: React.FC<MedicamentoFormProps> = ({
  formData,
  categorias,
  vistaPrevia,
  subiendoImagen,
  onInputChange,
  onSubirImagen,
  onLimpiarVistaPrevia,
  fileInputRef,
}) => {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Código de Barras */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Código de Barras *
          </label>
          <input
            type="text"
            value={formData.codigoBarras}
            onChange={(e) => onInputChange("codigoBarras", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="777-12345"
          />
        </div>

        {/* Nombre Comercial */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nombre Comercial *
          </label>
          <input
            type="text"
            value={formData.nombreComercial}
            onChange={(e) => onInputChange("nombreComercial", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Paracetamol 500mg"
          />
        </div>

        {/* Nombre Genérico */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nombre Genérico *
          </label>
          <input
            type="text"
            value={formData.nombreGenerico}
            onChange={(e) => onInputChange("nombreGenerico", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Paracetamol"
          />
        </div>

        {/* Presentación */}
        <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
            Presentación *
        </label>
        <select
            value={formData.presentacion}
            onChange={(e) => onInputChange("presentacion", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
            <option value="">Seleccionar presentación</option>
            <option value="Caja x 10 tabletas">Caja x 10 tabletas</option>
            <option value="Caja x 20 tabletas">Caja x 20 tabletas</option>
            <option value="Caja x 30 tabletas">Caja x 30 tabletas</option>
            <option value="Caja x 50 tabletas">Caja x 50 tabletas</option>
            <option value="Caja x 100 tabletas">Caja x 100 tabletas</option>
            <option value="Frasco x 10ml">Frasco x 10ml</option>
            <option value="Frasco x 20ml">Frasco x 20ml</option>
            <option value="Frasco x 30ml">Frasco x 30ml</option>
            <option value="Frasco x 50ml">Frasco x 50ml</option>
            <option value="Frasco x 100ml">Frasco x 100ml</option>
            <option value="Frasco x 120ml">Frasco x 120ml</option>
            <option value="Frasco x 250ml">Frasco x 250ml</option>
            <option value="Ampolla x 2ml">Ampolla x 2ml</option>
            <option value="Ampolla x 5ml">Ampolla x 5ml</option>
            <option value="Ampolla x 10ml">Ampolla x 10ml</option>
            <option value="Tabletas sueltas">Tabletas sueltas</option>
            <option value="Cápsulas">Cápsulas</option>
            <option value="Jarabe">Jarabe</option>
            <option value="Suspensión">Suspensión</option>
            <option value="Crema">Crema</option>
            <option value="Pomada">Pomada</option>
            <option value="Gel">Gel</option>
            <option value="Gotas">Gotas</option>
            <option value="Spray">Spray</option>
            <option value="Inyectable">Inyectable</option>
            <option value="Supositorio">Supositorio</option>
            <option value="Óvulo">Óvulo</option>
            <option value="Parche">Parche</option>
            <option value="Otro">Otro</option>
        </select>
        </div>

        {/* Precio Compra */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Precio Compra *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.precioCompra}
            onChange={(e) => onInputChange("precioCompra", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="5.00"
          />
        </div>

        {/* Precio Venta */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Precio Venta *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.precioVenta}
            onChange={(e) => onInputChange("precioVenta", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="10.00"
          />
        </div>

        {/* Stock */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Stock *
          </label>
          <input
            type="number"
            value={formData.stock}
            onChange={(e) => onInputChange("stock", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="100"
          />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Categoría *
          </label>
          <select
            value={formData.idCategoria}
            onChange={(e) => onInputChange("idCategoria", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Seleccionar categoría</option>
            {categorias.map((cat) => (
              <option key={cat.id_categoria} value={cat.id_categoria}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Requiere Receta */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Requiere Receta
          </label>
          <select
            value={formData.requiereReceta.toString()}
            onChange={(e) => onInputChange("requiereReceta", e.target.value === "true")}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="false">No</option>
            <option value="true">Sí</option>
          </select>
        </div>
      </div>

      {/* Imagen */}
      <div className="border-t pt-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Imagen del Medicamento
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onSubirImagen}
          className="hidden"
        />

        <div className="flex gap-3 items-start">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={subiendoImagen}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
          >
            <i className="fa-solid fa-upload"></i>
            {subiendoImagen ? "Subiendo..." : "Subir desde dispositivo"}
          </button>

          <div className="flex-1">
            <input
              type="url"
              value={formData.imagen}
              onChange={(e) => onInputChange("imagen", e.target.value)}
              placeholder="O ingresa una URL de imagen..."
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {(vistaPrevia || formData.imagen) && (
          <div className="mt-3 relative inline-block">
            <img
              src={vistaPrevia || formData.imagen}
              alt="Vista previa"
              className="h-32 w-32 object-cover rounded-lg border-2 border-gray-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'%3E%3Crect fill='%23e5e7eb' width='128' height='128'/%3E%3C/svg%3E";
              }}
            />
            <button
              type="button"
              onClick={onLimpiarVistaPrevia}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          Formatos permitidos: JPG, PNG, GIF, WEBP (Máx. 5MB)
        </p>
      </div>
    </form>
  );
};

export default MedicamentoForm;