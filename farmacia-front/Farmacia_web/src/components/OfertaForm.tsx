export interface OfertaFormData {
  nombreOferta: string;
  descripcion: string;
  porcentajeDescuento: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

interface OfertaFormProps {
  formData: OfertaFormData;
  onInputChange: (field: keyof OfertaFormData, value: string | boolean) => void;
}

const INPUT_CLASS =
  "w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";

const OfertaForm = ({ formData, onInputChange }: OfertaFormProps) => {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nombre de la oferta *
          </label>
          <input
            type="text"
            value={formData.nombreOferta}
            onChange={(e) => onInputChange("nombreOferta", e.target.value)}
            required
            className={INPUT_CLASS}
            placeholder="Ej: Descuento de verano"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Porcentaje de descuento (%) *
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.porcentajeDescuento}
            onChange={(e) => onInputChange("porcentajeDescuento", e.target.value)}
            required
            className={INPUT_CLASS}
            placeholder="10"
          />
          <p className="text-xs text-gray-500 mt-1">Entre 0% y 100%</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={formData.activo ? "true" : "false"}
            onChange={(e) => onInputChange("activo", e.target.value === "true")}
            className={INPUT_CLASS}
          >
            <option value="true">Activa</option>
            <option value="false">Inactiva</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => onInputChange("descripcion", e.target.value)}
            rows={3}
            className={INPUT_CLASS}
            placeholder="Descripción de la promoción..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Fecha de inicio *
          </label>
          <input
            type="date"
            value={formData.fechaInicio}
            onChange={(e) => onInputChange("fechaInicio", e.target.value)}
            required
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Fecha de fin *
          </label>
          <input
            type="date"
            value={formData.fechaFin}
            onChange={(e) => onInputChange("fechaFin", e.target.value)}
            required
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </form>
  );
};

export default OfertaForm;
