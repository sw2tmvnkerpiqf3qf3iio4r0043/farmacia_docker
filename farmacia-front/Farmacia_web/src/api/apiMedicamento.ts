import apiClient from "./apiClient";

export interface Medicamento {
  idMedicamento: number;
  codigoBarras: string;
  nombreComercial: string;
  nombreGenerico: string;
  idCategoria: number;
  tipoProducto: string;
  presentacion: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  requiereReceta: boolean;
  activo: boolean;
  imagen?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicamentoStats {
  totalMedicamentos: number;
  totalUnidadesInventario: number;
  valorTotalInventario: number;
  totalRequiereReceta: number;
  totalStockCritico: number;
  totalAgotados: number;
}

// Obtener todos los medicamentos
export const getMedicamento = async (): Promise<Medicamento[]> => {
  const response = await apiClient.get("/medicamento");
  return response.data;
};

// Obtener estadísticas
export const getEstadisticas = async (): Promise<MedicamentoStats> => {
  const response = await apiClient.get("/medicamento/estadisticas");
  return response.data;
};

// Obtener stock crítico
export const getStockCritico = async (): Promise<Medicamento[]> => {
  const response = await apiClient.get("/medicamento/stock-critico");
  return response.data;
};

// Buscar por nombre
export const buscarMedicamento = async (nombre: string): Promise<Medicamento[]> => {
  const response = await apiClient.get(`/medicamento/buscar?nombre=${nombre}`);
  return response.data;
};

// Crear medicamento
export const createMedicamento = async (data: Partial<Medicamento>): Promise<Medicamento> => {
  const response = await apiClient.post("/medicamento", data);
  return response.data;
};

// Actualizar medicamento
export const updateMedicamento = async (
  id: number,
  data: Partial<Medicamento>
): Promise<Medicamento> => {
  const response = await apiClient.put(`/medicamento/${id}`, data);
  return response.data;
};

// Eliminar medicamento
export const deleteMedicamento = async (id: number): Promise<void> => {
  await apiClient.delete(`/medicamento/${id}`);
};