import apiClient from "./apiClient";
import type { Cliente } from "../types/farmacia";

export interface ClienteMiPayload {
  telefono?: string;
  ci?: string;
  fechaNacimiento?: string | null;
  condicionesCronicas?: string | null;
}

interface RawCliente {
  [key: string]: unknown;
  idCliente?: number | string | null;
  id_cliente?: number | string | null;
  id?: number | string | null;
  idPersona?: number | string | null;
  id_persona?: number | string | null;
  ci?: string | number | null;
  nombreCompleto?: string | null;
  nombre?: string | null;
  telefono?: string | number | null;
  email?: string | null;
  fechaNacimiento?: string | null;
  fecha_nacimiento?: string | null;
  condicionesCronicas?: string | null;
  condiciones_cronicas?: string | null;
  esLocal?: boolean | number | string | null;
  es_local?: boolean | number | string | null;
  activo?: boolean | number | string | null;
}

function numero(valor: unknown, fallback = 0): number {
  if (valor === undefined || valor === null || valor === "") return fallback;
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : fallback;
}

function numeroOpcional(valor: unknown): number | undefined {
  const resultado = numero(valor, Number.NaN);
  return Number.isFinite(resultado) ? resultado : undefined;
}

function texto(valor: unknown, fallback = ""): string {
  return valor === undefined || valor === null || valor === "" ? fallback : String(valor);
}

function booleano(valor: unknown): boolean {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor !== 0;
  return !["", "0", "false", "no"].includes(texto(valor).toLowerCase());
}

function normalizarCliente(raw: RawCliente): Cliente {
  const nombre = texto(raw.nombreCompleto ?? raw.nombre);
  const activo = raw.activo === undefined || raw.activo === null ? true : booleano(raw.activo);
  return {
    idCliente: numero(raw.idCliente ?? raw.id_cliente ?? raw.id),
    idPersona: numeroOpcional(raw.idPersona ?? raw.id_persona),
    ci: texto(raw.ci),
    nombre,
    nombreCompleto: raw.nombreCompleto ?? nombre,
    telefono: texto(raw.telefono),
    email: raw.email ?? null,
    fechaNacimiento: raw.fechaNacimiento ?? raw.fecha_nacimiento ?? null,
    condicionesCronicas: raw.condicionesCronicas ?? raw.condiciones_cronicas ?? null,
    esLocal: booleano(raw.esLocal ?? raw.es_local),
    activo,
  };
}

export const getClientes = async (buscar?: string): Promise<Cliente[]> => {
  const response = await apiClient.get<Cliente[]>("/cliente", {
    params: buscar ? { buscar, activo: "true" } : { activo: "true" },
  });
  return response.data;
};

export const getMiCliente = async (): Promise<Cliente> => {
  const response = await apiClient.get<RawCliente>("/cliente/mi");
  return normalizarCliente(response.data);
};

export const updateMiCliente = async (data: ClienteMiPayload): Promise<Cliente> => {
  const response = await apiClient.put<RawCliente>("/cliente/mi", data);
  return normalizarCliente(response.data);
};
