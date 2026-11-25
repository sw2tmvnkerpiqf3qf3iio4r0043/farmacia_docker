import apiClient from "../api/apiUsuarios";
import { getApiErrorMessage } from "../api/apiErrors";

export type RoleUsuario = "admin" | "regente" | "vendedor" | "almacenero" | "user";

export interface AppUser {
  id: number;
  email: string;
  name: string;
  role: RoleUsuario;
  idCliente: number | null;
  activo: boolean;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: RoleUsuario;
  idCliente: number | null;
  activo: boolean;
}

export type UpdateUserPayload = Partial<CreateUserPayload>;

interface RawUser {
  id?: number;
  id_usuario?: number;
  idUsuario?: number;
  email?: string;
  name?: string;
  nombre?: string;
  password?: string;
  role?: string | null;
  rol?: string | null;
  idCliente?: number | null;
  id_cliente?: number | null;
  activo?: boolean | number | string | null;
}

export function normalizarRol(valor: unknown): RoleUsuario {
  const rol = String(valor ?? "").trim().toLowerCase();
  if (rol === "administrador" || rol === "admin") return "admin";
  if (rol === "regente") return "regente";
  if (rol === "vendedor") return "vendedor";
  if (rol === "almacenero") return "almacenero";
  return "user";
}

function normalizarActivo(valor: unknown): boolean {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor !== 0;
  if (typeof valor === "string") {
    const texto = valor.trim().toLowerCase();
    return texto === "1" || texto === "true" || texto === "activo";
  }
  return true;
}

function normalizarUsuario(raw: RawUser): AppUser {
  return {
    id: Number(raw.id ?? raw.id_usuario ?? raw.idUsuario ?? 0),
    email: String(raw.email ?? ""),
    name: String(raw.name ?? raw.nombre ?? ""),
    role: normalizarRol(raw.role ?? raw.rol),
    idCliente:
      raw.idCliente !== undefined && raw.idCliente !== null
        ? Number(raw.idCliente)
        : raw.id_cliente !== undefined && raw.id_cliente !== null
          ? Number(raw.id_cliente)
          : null,
    activo: normalizarActivo(raw.activo),
  };
}

function extraerLista(data: unknown): RawUser[] {
  if (Array.isArray(data)) return data as RawUser[];
  if (data && typeof data === "object") {
    const objeto = data as { usuarios?: unknown; users?: unknown; data?: unknown };
    if (Array.isArray(objeto.usuarios)) return objeto.usuarios as RawUser[];
    if (Array.isArray(objeto.users)) return objeto.users as RawUser[];
    if (Array.isArray(objeto.data)) return objeto.data as RawUser[];
  }
  return [];
}

function extraerUno(data: unknown): RawUser {
  if (data && typeof data === "object") {
    const objeto = data as { usuario?: RawUser; user?: RawUser };
    if (objeto.usuario) return objeto.usuario;
    if (objeto.user) return objeto.user;
    return data as RawUser;
  }
  return {};
}

export const userService = {
  getAll: async (): Promise<AppUser[]> => {
    const response = await apiClient.get("/usuario");
    return extraerLista(response.data).map(normalizarUsuario);
  },

  getById: async (id: number): Promise<AppUser> => {
    const response = await apiClient.get(`/usuario/${id}`);
    return normalizarUsuario(extraerUno(response.data));
  },

  create: async (payload: CreateUserPayload): Promise<AppUser> => {
    const response = await apiClient.post("/usuario", payload);
    return normalizarUsuario(extraerUno(response.data));
  },

  update: async (id: number, payload: UpdateUserPayload): Promise<AppUser> => {
    const response = await apiClient.put(`/usuario/${id}`, payload);
    return normalizarUsuario(extraerUno(response.data));
  },

  getErrorMessage: (error: unknown, fallback = "No se pudo procesar la solicitud"): string =>
    getApiErrorMessage(error, fallback),
};
