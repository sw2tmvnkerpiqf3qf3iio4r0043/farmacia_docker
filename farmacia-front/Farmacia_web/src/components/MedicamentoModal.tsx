import React from "react";
import MedicamentoForm from "./MedicamentoForm";

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

interface MedicamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  formData: FormData;
  categorias: Categoria[];
  vistaPrevia: string;
  subiendoImagen: boolean;
  editandoId: number | null;
  onInputChange: (field: string, value: any) => void;
  onSubirImagen: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLimpiarVistaPrevia: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const MedicamentoModal: React.FC<MedicamentoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  formData,
  categorias,
  vistaPrevia,
  subiendoImagen,
  editandoId,
  onInputChange,
  onSubirImagen,
  onLimpiarVistaPrevia,
  fileInputRef,
}) => {
  if (!isOpen) return null;

  return (
    // ✅ CAMBIO: Se quitó "bg-black bg-opacity-50" y "backdrop-blur-sm"
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {editandoId ? "️ Editar Medicamento" : "➕ Agregar Nuevo Medicamento"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {editandoId
                ? "Actualiza la información del medicamento"
                : "Completa los datos para registrar un nuevo medicamento"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-2xl"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <MedicamentoForm
            formData={formData}
            categorias={categorias}
            vistaPrevia={vistaPrevia}
            subiendoImagen={subiendoImagen}
            onInputChange={onInputChange}
            onSubirImagen={onSubirImagen}
            onLimpiarVistaPrevia={onLimpiarVistaPrevia}
            fileInputRef={fileInputRef}
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onSave}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-sm font-semibold transition"
          >
            {editandoId ? " Actualizar Medicamento" : "✅ Agregar Medicamento"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg text-sm font-semibold transition"
          >
            ❌ Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicamentoModal;