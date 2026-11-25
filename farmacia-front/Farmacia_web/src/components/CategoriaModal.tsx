import CategoriaForm from "./CategoriaForm";

export interface CategoriaFormData {
  nombre: string;
  descripcion: string;
  tipo_categoria: string;
  tipo_enfermedad: string;
  id_categoria_padre: string;
}

interface CategoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  formData: CategoriaFormData;
  categorias: Array<{ id_categoria: number; nombre: string }>;
  editandoId: number | null;
  guardando: boolean;
  errores: string[];
  onInputChange: (field: keyof CategoriaFormData, value: string) => void;
}

const CategoriaModal = ({
  isOpen,
  onClose,
  onSave,
  formData,
  categorias,
  editandoId,
  guardando,
  errores,
  onInputChange,
}: CategoriaModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {editandoId ? "Editar categoría" : "Nueva categoría"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {editandoId
                ? "Actualiza la información de la categoría"
                : "Completa los datos para crear una categoría"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-2xl"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {errores.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              <ul className="list-disc list-inside">
                {errores.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <CategoriaForm
            formData={formData}
            categorias={categorias}
            editandoId={editandoId}
            onInputChange={onInputChange}
          />
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onSave}
            disabled={guardando}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg text-sm font-semibold transition"
          >
            {guardando ? "Guardando..." : editandoId ? "Actualizar categoría" : "Guardar categoría"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg text-sm font-semibold transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoriaModal;
