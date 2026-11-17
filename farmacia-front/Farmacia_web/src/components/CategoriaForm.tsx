import React from "react";

interface CategoriaFormData {
  nombre: string;
  descripcion: string;
  tipo_categoria: string;
  tipo_enfermedad: string;
  id_categoria_padre: string;
}

interface CategoriaFormProps {
  formData: CategoriaFormData;
  categorias: Array<{ id_categoria: number; nombre: string }>;
  editandoId: number | null;
  onInputChange: (field: string, value: any) => void;
}

const CategoriaForm: React.FC<CategoriaFormProps> = ({
  formData,
  categorias,
  editandoId,
  onInputChange,
}) => {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nombre de la Categoría *
          </label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => onInputChange("nombre", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Ej: Analgésicos"
          />
        </div>

        {/* Tipo de Categoría */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Tipo de Categoría *
          </label>
          <select
            value={formData.tipo_categoria}
            onChange={(e) => onInputChange("tipo_categoria", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Seleccionar tipo</option>
            <option value="medicamento">Medicamento</option>
            <option value="parafarmacia">Parafarmacia</option>
            <option value="dermocosmetica">Dermocosmética</option>
            <option value="higiene">Higiene</option>
            <option value="salud">Salud</option>
            <option value="nutricion">Nutrición</option>
            <option value="bebe">Bebé</option>
            <option value="general">General</option>
          </select>
        </div>

        {/* Tipo de Enfermedad */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Tipo de Enfermedad
          </label>
          <select
            value={formData.tipo_enfermedad}
            onChange={(e) => onInputChange("tipo_enfermedad", e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="general">General</option>
            <option value="aguda">Aguda</option>
            <option value="cronica">Crónica</option>
            <option value="estacional">Estacional</option>
            <option value="bienestar">Bienestar</option>
            <option value="prevencion">Prevención</option>
            <option value="cuidado_personal">Cuidado Personal</option>
            <option value="infantil">Infantil</option>
            <option value="no_aplica">No Aplica</option>
          </select>
        </div>

        {/* Categoría Padre */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Categoría Padre (Opcional)
          </label>
          <select
            value={formData.id_categoria_padre}
            onChange={(e) => onInputChange("id_categoria_padre", e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Sin categoría padre (Categoría principal)</option>
            {categorias
              .filter((cat) => cat.id_categoria !== editandoId) // Evita que sea su propio padre
              .map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre}
                </option>
              ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Si seleccionas una categoría padre, esta se convertirá en una subcategoridad.
          </p>
        </div>

        {/* Descripción */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => onInputChange("descripcion", e.target.value)}
            rows={3}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Breve descripción de la categoría..."
          />
        </div>
      </div>
    </form>
  );
};

export default CategoriaForm;