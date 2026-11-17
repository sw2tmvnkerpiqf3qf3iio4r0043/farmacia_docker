import apiClient from "./apiClient";
import type { Proveedor } from "../types/farmacia";

export const getProveedores = async (): Promise<Proveedor[]> => {
  const response = await apiClient.get<Proveedor[]>("/proveedor");
  return response.data;
};
