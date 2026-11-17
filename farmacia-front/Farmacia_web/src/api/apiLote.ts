import apiClient from "./apiClient";
import type { CreateLotePayload, Lote } from "../types/farmacia";

export const getLotes = async (): Promise<Lote[]> => {
  const response = await apiClient.get<Lote[]>("/lote");
  return response.data;
};

export const getLotesMedicamento = async (idMedicamento: number): Promise<Lote[]> => {
  const response = await apiClient.get<Lote[]>(`/lote/medicamento/${idMedicamento}`);
  return response.data;
};

export const crearLote = async (data: CreateLotePayload): Promise<Lote> => {
  const response = await apiClient.post<Lote>("/lote", data);
  return response.data;
};
