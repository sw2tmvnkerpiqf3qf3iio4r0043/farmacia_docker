import { createContext } from "react";
import type { Medicamento } from "../api/apiMedicamento";

export interface MedicamentoItem extends Medicamento {
  descripcion?: string;
}

export interface MedicamentoContextType {
  medicamentos: MedicamentoItem[];
  cargarDatos: () => Promise<void>;
  agregarMedicamento: (med: Partial<MedicamentoItem>) => Promise<boolean>;
  actualizarMedicamento: (id: number, med: Partial<MedicamentoItem>) => Promise<boolean>;
  eliminarMedicamento: (id: number) => Promise<boolean>;
  cargando: boolean;
  error: string;
  clearError: () => void;
}

export const MedicamentoContext = createContext<MedicamentoContextType | undefined>(undefined);
