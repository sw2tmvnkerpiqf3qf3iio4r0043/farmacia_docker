import React from "react";

interface OfertaFormData {
  nombre_oferta: string;
  descripcion: string;
  porcentaje_descuento: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: string;
}

interface OfertaFormProps {
  formData: OfertaFormData;
  onInputChange: (field: string, value: any) => void;
}

const OfertaForm: React.FC<OfertaFormProps> = ({
  formData,
  onInputChange,
}) => {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre de la Oferta */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nombre de la Oferta *
          </label>
          <input
            type="text"
            value={formData.nombre_oferta}
            onChange={(e) => onInputChange("nombre_oferta", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Ej: Descuento Verano"
          />
        </div>

        {/* Porcentaje de Descuento */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Porcentaje de Descuento (%) *
          </label>
          <input
            type="number"
            value={formData.porcentaje_descuento}
            onChange={(e) => onInputChange("porcentaje_descuento", e.target.value)}
            min="0"
            max="100"
            step="0.01"
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="10"
          />
          <p className="text-xs text-gray-500 mt-1">Mínimo: 0% - Máximo: 100%</p>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Estado *
          </label>
          <select
            value={formData.activo}
            onChange={(e) => onInputChange("activo", e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="1">Activa</option>
            <option value="0">Inactiva</option>
          </select>
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
            placeholder="Descripción de la oferta..."
          />
        </div>

        {/* Fecha Inicio */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Fecha Inicio *
          </label>
          <input
            type="date"
            value={formData.fecha_inicio}
            onChange={(e) => onInputChange("fecha_inicio", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Fecha Fin */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Fecha Fin *
          </label>
          <input
            type="date"
            value={formData.fecha_fin}
            onChange={(e) => onInputChange("fecha_fin", e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </form>
  );
};

export default OfertaForm;