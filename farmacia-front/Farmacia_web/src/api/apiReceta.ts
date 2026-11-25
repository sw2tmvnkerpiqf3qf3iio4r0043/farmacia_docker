import apiClient from "./apiClient";
import type { Receta } from "../types/farmacia";

export interface UploadResponse {
  success: boolean;
  url: string;
  filename: string;
}

export interface CrearRecetaPayload {
  numeroReceta?: string;
  medicoPrescriptor?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  imagenUrl: string;
  observacionesReceta?: string;
}

interface RawReceta {
  [key: string]: unknown;
  idReceta?: number | string | null;
  id_receta?: number | string | null;
  id?: number | string | null;
  numeroReceta?: string | null;
  numero_receta?: string | null;
  medicoPrescriptor?: string | null;
  medico_prescriptor?: string | null;
  fechaEmision?: string | null;
  fecha_emision?: string | null;
  fechaVencimiento?: string | null;
  fecha_vencimiento?: string | null;
  imagenUrl?: string | null;
  imagen_url?: string | null;
  url?: string | null;
  observacionesReceta?: string | null;
  observaciones_receta?: string | null;
}

function numero(valor: unknown, fallback = 0): number {
  if (valor === undefined || valor === null || valor === "") return fallback;
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : fallback;
}

function texto(valor: unknown, fallback = ""): string {
  return valor === undefined || valor === null || valor === "" ? fallback : String(valor);
}

function normalizarReceta(raw: RawReceta): Receta {
  return {
    ...raw,
    idReceta: numero(raw.idReceta ?? raw.id_receta ?? raw.id),
    numeroReceta: raw.numeroReceta ?? raw.numero_receta ?? null,
    medicoPrescriptor: raw.medicoPrescriptor ?? raw.medico_prescriptor ?? null,
    fechaEmision: raw.fechaEmision ?? raw.fecha_emision ?? null,
    fechaVencimiento: raw.fechaVencimiento ?? raw.fecha_vencimiento ?? null,
    imagenUrl: texto(raw.imagenUrl ?? raw.imagen_url ?? raw.url),
    observacionesReceta: raw.observacionesReceta ?? raw.observaciones_receta ?? null,
  };
}

export const subirArchivoReceta = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("receta", file);
  const response = await apiClient.post<UploadResponse>("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const crearRecetaMia = async (data: CrearRecetaPayload): Promise<Receta> => {
  const response = await apiClient.post<RawReceta>("/receta/mia", data);
  return normalizarReceta(response.data);
};

export const getMisRecetas = async (): Promise<Receta[]> => {
  const response = await apiClient.get<RawReceta[]>("/receta/mias");
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map(normalizarReceta);
};
