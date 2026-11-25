import apiClient from "./apiClient";
import type { CreateVentaPayload, MetodoPago, Venta } from "../types/farmacia";

interface RawMetodoPago {
  [key: string]: unknown;
  idMetodoPago?: number | string | null;
  id_metodo_pago?: number | string | null;
  id?: number | string | null;
  nombre?: string | null;
  nombreMetodo?: string | null;
  nombre_metodo?: string | null;
}

function normalizarMetodoPago(raw: RawMetodoPago): MetodoPago {
  const valor = raw.idMetodoPago ?? raw.id_metodo_pago ?? raw.id;
  return {
    idMetodoPago: valor === undefined || valor === null || valor === "" ? 0 : Number(valor),
    nombre: String(raw.nombre ?? raw.nombreMetodo ?? raw.nombre_metodo ?? "Método"),
  };
}

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

export const getMisCompras = async (): Promise<Venta[]> => {
  const response = await apiClient.get<Venta[]>("/venta/mis-compras");
  return response.data;
};

export const getMetodosPago = async (): Promise<MetodoPago[]> => {
  const response = await apiClient.get<RawMetodoPago[]>("/venta/metodos-pago");
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map(normalizarMetodoPago).filter((m) => m.idMetodoPago > 0);
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
