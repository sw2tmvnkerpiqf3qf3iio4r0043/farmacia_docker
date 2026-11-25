import { useEffect, useState } from "react";
import PanelContenido from "../components/PanelContenido";
import CategoriaModal, { type CategoriaFormData } from "../components/CategoriaModal";
import apiClient from "../api/apiClient";
import { getApiErrorMessage } from "../api/apiErrors";

interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
  tipo_categoria?: string;
  tipo_enfermedad?: string;
  id_categoria_padre?: number | null;
  nombre_categoria_padre?: string;
  fecha_creacion?: string;
  fechaCreacion?: string;
}

type Role = "admin" | "regente" | "vendedor" | "almacenero" | "user";

const FORMULARIO_VACIO: CategoriaFormData = {
  nombre: "",
  descripcion: "",
  tipo_categoria: "medicamento",
  tipo_enfermedad: "general",
  id_categoria_padre: "",
};

function obtenerRol(): Role {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "user";
    const usuario = JSON.parse(raw) as { role?: unknown; rol?: unknown };
    const valor = String(usuario.role ?? usuario.rol ?? "").trim().toLowerCase();
    if (valor === "admin" || valor === "administrador") return "admin";
    if (valor === "regente") return "regente";
    if (valor === "vendedor") return "vendedor";
    if (valor === "almacenero") return "almacenero";
    return "user";
  } catch {
    return "user";
  }
}

function Categoria() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [notificacion, setNotificacion] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState<CategoriaFormData>(FORMULARIO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [rol] = useState<Role>(obtenerRol);

  const puedeGestionar = rol === "admin" || rol === "regente";

  const cargarCategorias = async () => {
    try {
      setCargando(true);
      setError("");
      const response = await apiClient.get("/categoria");
      setCategorias(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar las categorías."));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarCategorias();
  }, []);

  useEffect(() => {
    if (!notificacion) return;
    const temporizador = window.setTimeout(() => setNotificacion(""), 4000);
    return () => window.clearTimeout(temporizador);
  }, [notificacion]);

  const handleInputChange = (field: keyof CategoriaFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrores([]);
  };

  const abrirNueva = () => {
    setCategoriaEditando(null);
    setFormData(FORMULARIO_VACIO);
    setErrores([]);
    setNotificacion("");
    setModalAbierto(true);
  };

  const handleEditar = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setFormData({
      nombre: categoria.nombre ?? "",
      descripcion: categoria.descripcion ?? "",
      tipo_categoria: categoria.tipo_categoria ?? "medicamento",
      tipo_enfermedad: categoria.tipo_enfermedad ?? "general",
      id_categoria_padre:
        categoria.id_categoria_padre === null || categoria.id_categoria_padre === undefined
          ? ""
          : String(categoria.id_categoria_padre),
    });
    setErrores([]);
    setNotificacion("");
    setModalAbierto(true);
  };

  const handleSubmit = async () => {
    const listaErrores: string[] = [];
    if (!formData.nombre.trim()) listaErrores.push("El nombre de la categoría es obligatorio.");
    if (!formData.tipo_categoria) listaErrores.push("Selecciona el tipo de categoría.");
    if (listaErrores.length > 0) {
      setErrores(listaErrores);
      return;
    }

    const payload = {
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
      tipo_categoria: formData.tipo_categoria,
      tipo_enfermedad: formData.tipo_enfermedad || "general",
      id_categoria_padre: formData.id_categoria_padre
        ? Number(formData.id_categoria_padre)
        : null,
    };

    try {
      setGuardando(true);
      setError("");
      if (categoriaEditando) {
        await apiClient.put(`/categoria/${categoriaEditando.id_categoria}`, payload);
        setNotificacion("Categoría actualizada correctamente.");
      } else {
        await apiClient.post("/categoria", payload);
        setNotificacion("Categoría creada correctamente.");
      }
      setModalAbierto(false);
      setCategoriaEditando(null);
      await cargarCategorias();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo guardar la categoría."));
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (categoria: Categoria) => {
    const confirmado = window.confirm(`¿Eliminar la categoría "${categoria.nombre}"?`);
    if (!confirmado) return;
    try {
      setError("");
      await apiClient.delete(`/categoria/${categoria.id_categoria}`);
      setNotificacion("Categoría eliminada correctamente.");
      await cargarCategorias();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo eliminar la categoría."));
    }
  };

  if (cargando) {
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
          <h1 className="text-3xl font-bold text-gray-900">Gestión de categorías</h1>
          <p className="text-gray-600 mt-1">Listado completo de categorías</p>
        </div>
        {puedeGestionar && (
          <button
            onClick={abrirNueva}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            + Nueva categoría
          </button>
        )}
      </div>

      {notificacion && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
          {notificacion}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      )}
      {!puedeGestionar && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-4 text-sm">
          Solo los roles admin y regente pueden crear, editar o eliminar categorías.
        </div>
      )}

      <PanelContenido titulo={`Categorías (${categorias.length})`} colSpan={3}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Enfermedad</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Padre</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Fecha</th>
                {puedeGestionar && (
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categorias.map((categoria) => {
                const padre =
                  categoria.nombre_categoria_padre ||
                  categorias.find((cat) => cat.id_categoria === categoria.id_categoria_padre)?.nombre ||
                  "—";
                const fecha = categoria.fecha_creacion ?? categoria.fechaCreacion;
                return (
                  <tr key={categoria.id_categoria} className="hover:bg-blue-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-600">{categoria.id_categoria}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{categoria.nombre}</p>
                      {categoria.descripcion && (
                        <p className="text-xs text-gray-500">{categoria.descripcion}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold capitalize">
                        {(categoria.tipo_categoria || "—").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                      {(categoria.tipo_enfermedad || "—").replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{padre}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {fecha ? new Date(fecha).toLocaleDateString("es-BO") : "—"}
                    </td>
                    {puedeGestionar && (
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEditar(categoria)}
                            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => void handleEliminar(categoria)}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {categorias.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay categorías registradas.</div>
          )}
        </div>
      </PanelContenido>

      <CategoriaModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={() => void handleSubmit()}
        formData={formData}
        categorias={categorias}
        editandoId={categoriaEditando?.id_categoria ?? null}
        guardando={guardando}
        errores={errores}
        onInputChange={handleInputChange}
      />
    </div>
  );
}

export default Categoria;
