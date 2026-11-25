import { useEffect, useMemo, useState } from "react";
import PanelContenido from "../components/PanelContenido";
import { useUsers } from "../hooks/useUsers";
import {
  userService,
  type AppUser,
  type RoleUsuario,
} from "../services/userService";

const ROLES: Array<{ valor: RoleUsuario; etiqueta: string }> = [
  { valor: "admin", etiqueta: "Administrador" },
  { valor: "regente", etiqueta: "Regente" },
  { valor: "vendedor", etiqueta: "Vendedor" },
  { valor: "almacenero", etiqueta: "Almacenero" },
  { valor: "user", etiqueta: "Usuario" },
];

const INPUT_CLASS =
  "w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";

interface FormularioUsuario {
  email: string;
  name: string;
  password: string;
  role: RoleUsuario;
  activo: boolean;
}

const FORMULARIO_VACIO: FormularioUsuario = {
  email: "",
  name: "",
  password: "",
  role: "vendedor",
  activo: true,
};

function etiquetaRol(role: RoleUsuario): string {
  return ROLES.find((opcion) => opcion.valor === role)?.etiqueta ?? "Usuario";
}

function Usuarios() {
  const {
    data: usuarios = [],
    isLoading,
    error,
    refetch,
  } = useUsers();

  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<AppUser | null>(null);
  const [formulario, setFormulario] = useState<FormularioUsuario>(FORMULARIO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const [notificacion, setNotificacion] = useState("");

  useEffect(() => {
    if (!notificacion) return;
    const temporizador = window.setTimeout(() => setNotificacion(""), 4000);
    return () => window.clearTimeout(temporizador);
  }, [notificacion]);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return usuarios;
    return usuarios.filter(
      (usuario) =>
        usuario.email.toLowerCase().includes(texto) ||
        usuario.name.toLowerCase().includes(texto) ||
        etiquetaRol(usuario.role).toLowerCase().includes(texto)
    );
  }, [usuarios, busqueda]);

  const abrirNuevo = () => {
    setEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setErrorLocal("");
    setNotificacion("");
    setModalAbierto(true);
  };

  const abrirEdicion = (usuario: AppUser) => {
    setEditando(usuario);
    setFormulario({
      email: usuario.email,
      name: usuario.name,
      password: "",
      role: usuario.role,
      activo: usuario.activo,
    });
    setErrorLocal("");
    setNotificacion("");
    setModalAbierto(true);
  };

  const guardar = async () => {
    const listaErrores: string[] = [];
    if (!editando) {
      if (!formulario.email.trim()) listaErrores.push("El email es obligatorio.");
      if (!formulario.name.trim()) listaErrores.push("El nombre es obligatorio.");
      if (formulario.password.length < 6) {
        listaErrores.push("La contraseña debe tener al menos 6 caracteres.");
      }
    }
    if (listaErrores.length > 0) {
      setErrorLocal(listaErrores.join(" "));
      return;
    }

    try {
      setGuardando(true);
      setErrorLocal("");
      if (editando) {
        await userService.update(editando.id, {
          email: editando.email,
          name: editando.name,
          password: formulario.password || undefined,
          role: formulario.role,
          idCliente: editando.idCliente,
          activo: formulario.activo,
        });
        setNotificacion("Usuario actualizado correctamente.");
      } else {
        await userService.create({
          email: formulario.email.trim(),
          name: formulario.name.trim(),
          password: formulario.password,
          role: formulario.role,
          idCliente: null,
          activo: true,
        });
        setNotificacion("Usuario creado correctamente.");
      }
      setModalAbierto(false);
      await refetch();
    } catch (err) {
      setErrorLocal(
        userService.getErrorMessage(err, "No se pudo guardar el usuario. ¿El email ya existe?")
      );
    } finally {
      setGuardando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de usuarios</h1>
          <p className="text-gray-600 mt-1">Usuarios registrados y personal de la farmacia</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          + Nuevo usuario
        </button>
      </div>

      {notificacion && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
          {notificacion}
        </div>
      )}
      {(error || errorLocal) && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {errorLocal || error?.message || "No se pudieron cargar los usuarios."}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Buscar por nombre, email o rol..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <p className="text-sm text-gray-600 mt-2">
          Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
        </p>
      </div>

      <PanelContenido titulo={`Usuarios (${usuariosFiltrados.length})`} colSpan={2}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">ID cliente</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-3 text-sm text-gray-600">{usuario.id}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{usuario.name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{usuario.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                      {etiquetaRol(usuario.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        usuario.activo
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {usuario.idCliente ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => abrirEdicion(usuario)}
                      className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usuariosFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay usuarios registrados.</div>
          )}
        </div>
      </PanelContenido>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editando ? "Editar usuario" : "Nuevo usuario staff"}
              </h2>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
                title="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {errorLocal && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                  {errorLocal}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formulario.email}
                  onChange={(e) =>
                    setFormulario((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled={Boolean(editando)}
                  className={`${INPUT_CLASS} disabled:bg-gray-100`}
                  placeholder="usuario@farmacia.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formulario.name}
                  onChange={(e) => setFormulario((prev) => ({ ...prev, name: e.target.value }))}
                  disabled={Boolean(editando)}
                  className={`${INPUT_CLASS} disabled:bg-gray-100`}
                  placeholder="Nombre completo"
                />
              </div>
              {!editando && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={formulario.password}
                    onChange={(e) =>
                      setFormulario((prev) => ({ ...prev, password: e.target.value }))
                    }
                    className={INPUT_CLASS}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rol</label>
                <select
                  value={formulario.role}
                  onChange={(e) =>
                    setFormulario((prev) => ({ ...prev, role: e.target.value as RoleUsuario }))
                  }
                  className={INPUT_CLASS}
                >
                  {ROLES.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              {editando && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                  <select
                    value={formulario.activo ? "true" : "false"}
                    onChange={(e) =>
                      setFormulario((prev) => ({ ...prev, activo: e.target.value === "true" }))
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => void guardar()}
                disabled={guardando}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold"
              >
                {guardando ? "Guardando..." : editando ? "Actualizar" : "Crear usuario"}
              </button>
              <button
                onClick={() => setModalAbierto(false)}
                className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Usuarios;
