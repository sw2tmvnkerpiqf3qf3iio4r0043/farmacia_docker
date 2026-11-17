import apiClient from "./apiClient";
import type { Cliente } from "../types/farmacia";

export const getClientes = async (buscar?: string): Promise<Cliente[]> => {
  const response = await apiClient.get<Cliente[]>("/cliente", {
    params: buscar ? { buscar, activo: 'true' } : { activo: 'true' },
  });
  return response.data;
};
