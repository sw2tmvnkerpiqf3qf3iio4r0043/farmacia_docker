import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import PanelContenido from "../components/PanelContenido";
import MedicamentoModal from "../components/MedicamentoModal";
import type { MedicamentoFormData } from "../components/MedicamentoForm";
import apiClient from "../api/apiClient";
import { getApiErrorMessage } from "../api/apiErrors";
import { useMedicamentos } from "../context/useMedicamentos";
import type { MedicamentoItem } from "../context/medicamentoContextStore";
import { buildImageUrl } from "../utils/buildImageUrl";

interface Categoria {
  id_categoria: number;
  nombre: string;
}

const FORMULARIO_VACIO: MedicamentoFormData = {
  codigoBarras: "",
  nombreComercial: "",
  nombreGenerico: "",
  idCategoria: "",
  tipoProducto: "medicamento",
  presentacion: "",
  precioCompra: "",
  precioVenta: "",
  stock: "0",
  descripcion: "",
  requiereReceta: false,
  activo: true,
  imagen: "",
};

const IMAGEN_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23e5e7eb'/%3E%3C/svg%3E";

const POR_PAGINA = 10;

function normalizarUrlImagen(valor: string): string {
  const texto = valor.trim();
  if (!texto) return "";
  const indice = texto.indexOf("/uploads/");
  return indice >= 0 ? texto.slice(indice) : texto;
}

function Medicamento() {
  const {
    medicamentos,
    cargando,
    error,
    clearError,
    agregarMedicamento,
    actualizarMedicamento,
    eliminarMedicamento,
  } = useMedicamentos();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [errorCategorias, setErrorCategorias] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formulario, setFormulario] = useState<MedicamentoFormData>(FORMULARIO_VACIO);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [notificacion, setNotificacion] = useState("");
  const [medicamentoAEliminar, setMedicamentoAEliminar] = useState<MedicamentoItem | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let activo = true;
    const cargarCategorias = async () => {
      try {
        const response = await apiClient.get("/categoria");
        if (activo) setCategorias(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (activo) {
          setErrorCategorias(getApiErrorMessage(err, "No se pudieron cargar las categorías"));
        }
      } finally {
        if (activo) setCargandoCategorias(false);
      }
    };
    void cargarCategorias();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!notificacion) return;
    const temporizador = window.setTimeout(() => setNotificacion(""), 4000);
    return () => window.clearTimeout(temporizador);
  }, [notificacion]);

  const medicamentosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return medicamentos;
    return medicamentos.filter((med) =>
      [
        med.nombreComercial,
        med.nombreGenerico,
        med.codigoBarras,
        med.descripcion,
      ]
        .some((campo) => String(campo ?? "").toLowerCase().includes(texto))
    );
  }, [medicamentos, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(medicamentosFiltrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const medicamentosPaginados = medicamentosFiltrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

  const getCategoriaNombre = (idCategoria: number) =>
    categorias.find((cat) => cat.id_categoria === idCategoria)?.nombre ?? "Sin categoría";

  const getEstadoStock = (med: MedicamentoItem) => {
    if (!med.activo) return { texto: "Inactivo", color: "bg-gray-100 text-gray-700" };
    const stock = Number(med.stock ?? 0);
    if (stock <= 0) return { texto: "Agotado", color: "bg-red-100 text-red-700" };
    if (stock <= 10) return { texto: "Crítico", color: "bg-red-100 text-red-700" };
    if (stock <= 50) return { texto: "Bajo", color: "bg-yellow-100 text-yellow-700" };
    return { texto: "Normal", color: "bg-green-100 text-green-700" };
  };

  const handleInputChange = (field: keyof MedicamentoFormData, value: string | boolean) => {
    setFormulario((prev) => ({ ...prev, [field]: value }));
    setErrores([]);
  };

  const limpiarFormulario = () => {
    setFormulario(FORMULARIO_VACIO);
    setVistaPrevia("");
    setEditandoId(null);
    setErrores([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const abrirNuevo = () => {
    clearError();
    limpiarFormulario();
    setNotificacion("");
    setModalAbierto(true);
  };

  const handleSubirImagen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrores(["La imagen no puede superar los 5MB."]);
      return;
    }
    const tiposPermitidos = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!tiposPermitidos.includes(file.type)) {
      setErrores(["Solo se permiten imágenes JPG, PNG, GIF o WEBP."]);
      return;
    }

    const datos = new FormData();
    datos.append("imagen", file);

    try {
      setSubiendoImagen(true);
      setErrores([]);
      const response = await apiClient.post("/upload", datos, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = response.data?.url;
      if (response.data?.success !== true || typeof url !== "string" || !url) {
        throw new Error("El servidor no devolvió una URL de imagen válida.");
      }
      const imagen = normalizarUrlImagen(url);
      setFormulario((prev) => ({ ...prev, imagen }));
      setVistaPrevia(imagen);
    } catch (err) {
      setErrores([getApiErrorMessage(err, "No se pudo subir la imagen.")]);
      setVistaPrevia("");
    } finally {
      setSubiendoImagen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLimpiarImagen = () => {
    setFormulario((prev) => ({ ...prev, imagen: "" }));
    setVistaPrevia("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validarFormulario = (): string[] => {
    const lista: string[] = [];
    if (!formulario.codigoBarras.trim()) lista.push("El código es obligatorio.");
    if (!formulario.nombreComercial.trim()) lista.push("El nombre comercial es obligatorio.");
    if (!formulario.idCategoria) lista.push("Selecciona una categoría.");
    if (!formulario.tipoProducto) lista.push("Selecciona el tipo de producto.");
    const compra = Number(formulario.precioCompra);
    const venta = Number(formulario.precioVenta);
    if (formulario.precioCompra === "" || !Number.isFinite(compra) || compra < 0) {
      lista.push("El precio de compra debe ser un número mayor o igual a 0.");
    }
    if (formulario.precioVenta === "" || !Number.isFinite(venta) || venta < 0) {
      lista.push("El precio de venta debe ser un número mayor o igual a 0.");
    }
    const stock = Number(formulario.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      lista.push("El stock debe ser un número entero mayor o igual a 0.");
    }
    return lista;
  };

  const handleGuardar = async () => {
    const listaErrores = validarFormulario();
    if (listaErrores.length > 0) {
      setErrores(listaErrores);
      return;
    }

    const payload: Partial<MedicamentoItem> = {
      codigoBarras: formulario.codigoBarras.trim(),
      nombreComercial: formulario.nombreComercial.trim(),
      nombreGenerico: formulario.nombreGenerico.trim(),
      descripcion: formulario.descripcion.trim(),
      idCategoria: Number(formulario.idCategoria),
      tipoProducto: formulario.tipoProducto,
      presentacion: formulario.presentacion.trim(),
      precioCompra: Number(formulario.precioCompra),
      precioVenta: Number(formulario.precioVenta),
      stock: Number(formulario.stock),
      requiereReceta: formulario.requiereReceta,
      activo: formulario.activo,
      imagen: normalizarUrlImagen(formulario.imagen),
    };

    try {
      setGuardando(true);
      setErrores([]);
      const guardado = editandoId
        ? await actualizarMedicamento(editandoId, payload)
        : await agregarMedicamento(payload);
      if (!guardado) return;
      setNotificacion(editandoId ? "Producto actualizado correctamente." : "Producto creado correctamente.");
      setModalAbierto(false);
      limpiarFormulario();
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (med: MedicamentoItem) => {
    clearError();
    const imagen = normalizarUrlImagen(med.imagen ?? "");
    setFormulario({
      codigoBarras: med.codigoBarras ?? "",
      nombreComercial: med.nombreComercial ?? "",
      nombreGenerico: med.nombreGenerico ?? "",
      idCategoria: med.idCategoria ? String(med.idCategoria) : "",
      tipoProducto: med.tipoProducto || "medicamento",
      presentacion: med.presentacion ?? "",
      precioCompra: med.precioCompra === undefined || med.precioCompra === null ? "" : String(med.precioCompra),
      precioVenta: med.precioVenta === undefined || med.precioVenta === null ? "" : String(med.precioVenta),
      stock: med.stock === undefined || med.stock === null ? "0" : String(med.stock),
      descripcion: med.descripcion ?? "",
      requiereReceta: Boolean(med.requiereReceta),
      activo: med.activo !== false,
      imagen,
    });
    setVistaPrevia(imagen);
    setEditandoId(med.idMedicamento);
    setErrores([]);
    setNotificacion("");
    setModalAbierto(true);
  };

  const handleDuplicar = async (med: MedicamentoItem) => {
    clearError();
    const duplicado = await agregarMedicamento({
      codigoBarras: `${med.codigoBarras || "SIN-CODIGO"}-COPY-${Date.now()}`,
      nombreComercial: `${med.nombreComercial || "Producto"} (copia)`,
      nombreGenerico: med.nombreGenerico,
      descripcion: med.descripcion,
      idCategoria: med.idCategoria,
      tipoProducto: med.tipoProducto || "medicamento",
      presentacion: med.presentacion,
      precioCompra: med.precioCompra,
      precioVenta: med.precioVenta,
      stock: med.stock ?? 0,
      requiereReceta: med.requiereReceta,
      activo: true,
      imagen: normalizarUrlImagen(med.imagen ?? ""),
    });
    if (duplicado) setNotificacion("Producto duplicado correctamente.");
  };

  const confirmarEliminar = async () => {
    if (!medicamentoAEliminar) return;
    try {
      setEliminando(true);
      const eliminado = await eliminarMedicamento(medicamentoAEliminar.idMedicamento);
      if (eliminado) {
        setNotificacion("Producto eliminado correctamente.");
        setMedicamentoAEliminar(null);
      }
    } finally {
      setEliminando(false);
    }
  };

  if (cargando || cargandoCategorias) {
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
          <h1 className="text-3xl font-bold text-gray-900">Gestión de productos</h1>
          <p className="text-gray-600 mt-1">Administra el inventario de la farmacia</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          + Agregar producto
        </button>
      </div>

      {notificacion && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
          {notificacion}
        </div>
      )}
      {(error || errorCategorias) && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {error || errorCategorias}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Buscar por nombre, código, genérico o descripción..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
        />
        <p className="text-sm text-gray-600 mt-2">
          Mostrando {medicamentosFiltrados.length} de {medicamentos.length} productos
        </p>
      </div>

      <PanelContenido titulo={`Listado de productos (${medicamentosFiltrados.length})`} colSpan={3}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Imagen</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Presentación</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">P. venta</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Receta</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {medicamentosPaginados.map((med) => {
                const estado = getEstadoStock(med);
                const imagen = normalizarUrlImagen(med.imagen ?? "");
                return (
                  <tr key={med.idMedicamento} className="hover:bg-blue-50 transition">
                    <td className="px-4 py-3">
                      {imagen ? (
                        <img
                          src={buildImageUrl(imagen)}
                          alt={med.nombreComercial}
                          className="h-12 w-12 object-cover rounded-lg border mx-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = IMAGEN_FALLBACK;
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto text-gray-400">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{med.codigoBarras}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{med.nombreComercial}</p>
                      <p className="text-xs text-gray-500">{med.nombreGenerico || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {getCategoriaNombre(med.idCategoria)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                      {(med.tipoProducto || "—").replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{med.presentacion || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                        {med.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${estado.color}`}>
                        {estado.texto}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-700">
                      Bs. {Number(med.precioVenta ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {med.requiereReceta ? (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 whitespace-nowrap">
                          Requiere receta
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 whitespace-nowrap">
                          Sin receta
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleEditar(med)}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => void handleDuplicar(med)}
                          className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-semibold transition"
                        >
                          Duplicar
                        </button>
                        <button
                          onClick={() => setMedicamentoAEliminar(med)}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {medicamentosPaginados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron productos con esa búsqueda.
            </div>
          )}
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <button
              onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
              disabled={paginaActual === 1}
              className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-gray-600">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
              disabled={paginaActual === totalPaginas}
              className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </PanelContenido>

      <MedicamentoModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={() => void handleGuardar()}
        formData={formulario}
        categorias={categorias}
        vistaPrevia={vistaPrevia}
        subiendoImagen={subiendoImagen}
        guardando={guardando}
        errores={errores}
        editandoId={editandoId}
        onInputChange={handleInputChange}
        onSubirImagen={(event) => void handleSubirImagen(event)}
        onLimpiarImagen={handleLimpiarImagen}
        fileInputRef={fileInputRef}
      />

      {medicamentoAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar este producto?</h3>
            <p className="text-gray-600 mb-6">
              Esta acción no se puede deshacer. Se eliminará{" "}
              <strong>{medicamentoAEliminar.nombreComercial}</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMedicamentoAEliminar(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => void confirmarEliminar()}
                disabled={eliminando}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg"
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Medicamento;
