import apiClient from "./apiClient";
import type { CreateVentaPayload, MetodoPago, Venta } from "../types/farmacia";

export const getVentas = async (): Promise<Venta[]> => {
  const response = await apiClient.get<Venta[]>("/venta");
  return response.data;
};

export const getVenta = async (id: number): Promise<Venta> => {
  const response = await apiClient.get<Venta>(`/venta/${id}`);
  return response.data;
};

export const getVentasCliente = async (idCliente: number): Promise<Venta[]> => {
  const response = await apiClient.get<Venta[]>(`/venta/cliente/${idCliente}`);
  return response.data;
};

export const getMetodosPago = async (): Promise<MetodoPago[]> => {
  const response = await apiClient.get<MetodoPago[]>("/venta/metodos-pago");
  return response.data;
};

export const crearVenta = async (data: CreateVentaPayload): Promise<Venta> => {
  const response = await apiClient.post<Venta>("/venta", data);
  return response.data;
};

export const anularVenta = async (id: number, motivo?: string): Promise<Venta> => {
  const response = await apiClient.patch<Venta>(`/venta/${id}/anular`, { motivo });
  return response.data;
};

export const anularPago = async (idVenta: number, idPago: number): Promise<Venta> => {
  const response = await apiClient.patch<Venta>(`/venta/${idVenta}/pagos/${idPago}/anular`);
  return response.data;
};
