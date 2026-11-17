import apiClient from "./apiClient";
import type { Compra, CreateCompraPayload } from "../types/farmacia";

export const getCompras = async (): Promise<Compra[]> => {
  const response = await apiClient.get<Compra[]>("/compra");
  return response.data;
};

export const getCompra = async (id: number): Promise<Compra> => {
  const response = await apiClient.get<Compra>(`/compra/${id}`);
  return response.data;
};

export const crearCompra = async (data: CreateCompraPayload): Promise<Compra> => {
  const response = await apiClient.post<Compra>("/compra", data);
  return response.data;
};

export const cambiarEstadoCompra = async (
  id: number,
  estado: 'pendiente' | 'completada' | 'devuelta_parcial' | 'devuelta_total'
): Promise<Compra> => {
  const response = await apiClient.patch<Compra>(`/compra/${id}/estado`, { estado });
  return response.data;
};
