import { useEffect, useMemo, useState } from "react";
import PanelContenido from "../components/PanelContenido";
import OfertaModal from "../components/OfertaModal";
import type { OfertaFormData } from "../components/OfertaForm";
import apiClient from "../api/apiClient";
import { getApiErrorMessage } from "../api/apiErrors";

interface Oferta {
  idOferta: number;
  nombreOferta: string;
  descripcion: string;
  porcentajeDescuento: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  createdAt?: string;
}

interface RawOferta {
  [key: string]: unknown;
  idOferta?: number | string;
  id_oferta?: number | string;
  id?: number | string;
  nombreOferta?: string;
  nombre_oferta?: string;
  descripcion?: string;
  porcentajeDescuento?: number | string;
  porcentaje_descuento?: number | string;
  fechaInicio?: string;
  fecha_inicio?: string;
  fechaFin?: string;
  fecha_fin?: string;
  activo?: boolean | number | string;
  createdAt?: string;
  created_at?: string;
}

type Role = "admin" | "regente" | "vendedor" | "almacenero" | "user";

const FORMULARIO_VACIO: OfertaFormData = {
  nombreOferta: "",
  descripcion: "",
  porcentajeDescuento: "0",
  fechaInicio: "",
  fechaFin: "",
  activo: true,
};

function numero(valor: unknown, fallback = 0): number {
  if (valor === undefined || valor === null || valor === "") return fallback;
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : fallback;
}

function texto(valor: unknown, fallback = ""): string {
  return valor === undefined || valor === null || valor === "" ? fallback : String(valor);
}

function esActivo(valor: unknown): boolean {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor !== 0;
  return String(valor ?? "").toLowerCase() === "true" || String(valor ?? "") === "1";
}

function normalizarOferta(raw: RawOferta): Oferta {
  return {
    idOferta: numero(raw.idOferta ?? raw.id_oferta ?? raw.id),
    nombreOferta: texto(raw.nombreOferta ?? raw.nombre_oferta, "Oferta sin nombre"),
    descripcion: texto(raw.descripcion),
    porcentajeDescuento: numero(raw.porcentajeDescuento ?? raw.porcentaje_descuento),
    fechaInicio: texto(raw.fechaInicio ?? raw.fecha_inicio),
    fechaFin: texto(raw.fechaFin ?? raw.fecha_fin),
    activo: esActivo(raw.activo),
    createdAt: texto(raw.createdAt ?? raw.created_at),
  };
}

function extraerOfertas(data: unknown): Oferta[] {
  const lista = Array.isArray(data)
    ? (data as RawOferta[])
    : data && typeof data === "object"
      ? (Object.values(data as Record<string, unknown>).find((valor) => Array.isArray(valor)) as
          | RawOferta[]
          | undefined) ?? []
      : [];
  return lista.map(normalizarOferta).filter((oferta) => oferta.idOferta > 0);
}

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

function convertirFecha(fecha: string, finDelDia = false): string {
  if (!fecha) return "";
  if (fecha.includes("T")) return fecha;
  if (fecha.includes("/")) {
    const [dia, mes, anio] = fecha.split("/");
    return `${anio}-${mes}-${dia}T${finDelDia ? "23:59:59.999" : "00:00:00.000"}Z`;
  }
  return `${fecha}T${finDelDia ? "23:59:59.999" : "00:00:00.000"}Z`;
}

function fechaLocal(valor: string, finDelDia = false): Date | null {
  if (!valor) return null;
  const partes = valor.slice(0, 10).split("-").map(Number);
  if (partes.length !== 3 || partes.some((parte) => Number.isNaN(parte))) return null;
  const fecha = new Date(
    partes[0],
    partes[1] - 1,
    partes[2],
    finDelDia ? 23 : 0,
    finDelDia ? 59 : 0,
    finDelDia ? 59 : 0
  );
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function formatearFecha(valor: string): string {
  const fecha = fechaLocal(valor);
  return fecha ? fecha.toLocaleDateString("es-BO") : "Sin fecha";
}

function Oferta() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [notificacion, setNotificacion] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ofertaEditando, setOfertaEditando] = useState<Oferta | null>(null);
  const [formData, setFormData] = useState<OfertaFormData>(FORMULARIO_VACIO);
  const [busqueda, setBusqueda] = useState("");
  const [rol] = useState<Role>(obtenerRol);

  const puedeGestionar = rol === "admin" || rol === "regente";

  const cargarOfertas = async () => {
    try {
      setCargando(true);
      setError("");
      const response = await apiClient.get("/oferta");
      const lista = extraerOfertas(response.data).sort(
        (a, b) => numero(b.createdAt === "" ? 0 : new Date(b.createdAt ?? 0).getTime()) -
          numero(a.createdAt === "" ? 0 : new Date(a.createdAt ?? 0).getTime())
      );
      setOfertas(lista);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar las ofertas."));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarOfertas();
  }, []);

  useEffect(() => {
    if (!notificacion) return;
    const temporizador = window.setTimeout(() => setNotificacion(""), 4000);
    return () => window.clearTimeout(temporizador);
  }, [notificacion]);

  const ofertasFiltradas = useMemo(() => {
    const textoBusqueda = busqueda.trim().toLowerCase();
    if (!textoBusqueda) return ofertas;
    return ofertas.filter(
      (oferta) =>
        oferta.nombreOferta.toLowerCase().includes(textoBusqueda) ||
        oferta.descripcion.toLowerCase().includes(textoBusqueda)
    );
  }, [ofertas, busqueda]);

  const handleInputChange = (field: keyof OfertaFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const abrirNueva = () => {
    setOfertaEditando(null);
    setFormData(FORMULARIO_VACIO);
    setError("");
    setNotificacion("");
    setModalAbierto(true);
  };

  const handleEditar = (oferta: Oferta) => {
    setOfertaEditando(oferta);
    setFormData({
      nombreOferta: oferta.nombreOferta,
      descripcion: oferta.descripcion,
      porcentajeDescuento: String(oferta.porcentajeDescuento),
      fechaInicio: oferta.fechaInicio.slice(0, 10),
      fechaFin: oferta.fechaFin.slice(0, 10),
      activo: oferta.activo,
    });
    setError("");
    setNotificacion("");
    setModalAbierto(true);
  };

  const obtenerIdsAsignados = async (idOferta: number): Promise<number[]> => {
    const response = await apiClient.get(`/oferta/${idOferta}/medicamentos`);
    const lista = Array.isArray(response.data)
      ? (response.data as Array<Record<string, unknown>>)
      : [];
    return lista
      .map((item) =>
        numero(item.idMedicamento ?? item.id_medicamento ?? item.id)
      )
      .filter((id) => id > 0);
  };

  const handleSubmit = async (medicamentosSeleccionados: number[]) => {
    const listaErrores: string[] = [];
    if (!formData.nombreOferta.trim()) listaErrores.push("El nombre de la oferta es obligatorio.");
    if (!formData.fechaInicio || !formData.fechaFin) {
      listaErrores.push("Las fechas de inicio y fin son obligatorias.");
    }
    const porcentaje = numero(formData.porcentajeDescuento, -1);
    if (porcentaje < 0 || porcentaje > 100) {
      listaErrores.push("El porcentaje debe estar entre 0 y 100.");
    }
    if (
      formData.fechaInicio &&
      formData.fechaFin &&
      formData.fechaInicio > formData.fechaFin
    ) {
      listaErrores.push("La fecha de fin debe ser posterior a la de inicio.");
    }
    if (listaErrores.length > 0) {
      setError(listaErrores.join(" "));
      return;
    }

    const datos = {
      nombreOferta: formData.nombreOferta.trim(),
      descripcion: formData.descripcion.trim(),
      porcentajeDescuento: porcentaje,
      fechaInicio: convertirFecha(formData.fechaInicio),
      fechaFin: convertirFecha(formData.fechaFin, true),
      activo: formData.activo,
    };

    try {
      setGuardando(true);
      setError("");
      let idOferta = ofertaEditando?.idOferta ?? null;

      if (idOferta) {
        await apiClient.put(`/oferta/${idOferta}`, datos);
        const idsActuales = await obtenerIdsAsignados(idOferta);
        const idsNuevos = medicamentosSeleccionados.filter((id) => !idsActuales.includes(id));
        const idsQuitar = idsActuales.filter((id) => !medicamentosSeleccionados.includes(id));
        for (const id of idsNuevos) {
          await apiClient.post(`/oferta/${idOferta}/medicamentos`, { idMedicamento: id });
        }
        for (const id of idsQuitar) {
          await apiClient.delete(`/oferta/${idOferta}/medicamentos/${id}`);
        }
      } else {
        const response = await apiClient.post("/oferta", datos);
        idOferta = numero(
          response.data?.idOferta ?? response.data?.id_oferta ?? response.data?.id
        );
        if (!idOferta) throw new Error("No se pudo obtener el ID de la oferta creada.");
        for (const id of medicamentosSeleccionados) {
          await apiClient.post(`/oferta/${idOferta}/medicamentos`, { idMedicamento: id });
        }
      }

      await cargarOfertas();
      setModalAbierto(false);
      setOfertaEditando(null);
      setFormData(FORMULARIO_VACIO);
      setNotificacion("Oferta guardada correctamente.");
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo guardar la oferta."));
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (oferta: Oferta) => {
    const confirmado = window.confirm(`¿Eliminar la oferta "${oferta.nombreOferta}"?`);
    if (!confirmado) return;
    try {
      setError("");
      await apiClient.delete(`/oferta/${oferta.idOferta}`);
      setNotificacion("Oferta eliminada correctamente.");
      await cargarOfertas();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo eliminar la oferta."));
    }
  };

  const obtenerEstado = (oferta: Oferta) => {
    if (!oferta.activo) {
      return {
        texto: "Inactiva",
        color: "bg-gray-100 text-gray-700",
        icono: "⏸️",
        descripcion: "Desactivada manualmente",
      };
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicio = fechaLocal(oferta.fechaInicio);
    const fin = fechaLocal(oferta.fechaFin, true);
    if (inicio && hoy < inicio) {
      return {
        texto: "Programada",
        color: "bg-blue-100 text-blue-700",
        icono: "📅",
        descripcion: `Inicia: ${formatearFecha(oferta.fechaInicio)}`,
      };
    }
    if (fin && hoy > fin) {
      return {
        texto: "Vencida",
        color: "bg-orange-100 text-orange-700",
        icono: "⏰",
        descripcion: `Venció: ${formatearFecha(oferta.fechaFin)}`,
      };
    }
    return {
      texto: "Activa",
      color: "bg-green-100 text-green-700",
      icono: "✅",
      descripcion: "Oferta vigente",
    };
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
          <h1 className="text-3xl font-bold text-gray-900">Ofertas y promociones</h1>
          <p className="text-gray-600 mt-1">Gestiona descuentos y productos asignados</p>
        </div>
        {puedeGestionar && (
          <button
            onClick={abrirNueva}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            + Nueva oferta
          </button>
        )}
      </div>

      {notificacion && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
          {notificacion}
        </div>
      )}
      {(error || !puedeGestionar) && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error || "Solo los roles admin y regente pueden gestionar ofertas."}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Buscar oferta por nombre o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
        />
        <p className="text-sm text-gray-600 mt-2">
          Mostrando {ofertasFiltradas.length} de {ofertas.length} ofertas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ofertasFiltradas.map((oferta) => {
          const estado = obtenerEstado(oferta);
          return (
            <PanelContenido key={oferta.idOferta} titulo="" colSpan={1}>
              <div className="relative">
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  -{oferta.porcentajeDescuento.toFixed(2)}%
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 pr-16">{oferta.nombreOferta}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {oferta.descripcion || "Sin descripción"}
                </p>
                <div className="text-xs text-gray-500 mb-3 space-y-1">
                  <div>Inicio: {formatearFecha(oferta.fechaInicio)}</div>
                  <div>Fin: {formatearFecha(oferta.fechaFin)}</div>
                </div>
                <div
                  className={`inline-flex flex-col px-3 py-2 rounded-lg text-xs font-bold ${estado.color} mb-4`}
                >
                  <span>
                    {estado.icono} {estado.texto}
                  </span>
                  <span className="opacity-75">{estado.descripcion}</span>
                </div>
                {puedeGestionar && (
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleEditar(oferta)}
                      className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg text-sm font-semibold"
                    >
                      Editar y asignar
                    </button>
                    <button
                      onClick={() => void handleEliminar(oferta)}
                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg text-sm font-semibold"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </PanelContenido>
          );
        })}
      </div>

      {ofertasFiltradas.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {busqueda.trim()
            ? `No se encontraron ofertas con "${busqueda}"`
            : "No hay ofertas registradas."}
        </div>
      )}

      <OfertaModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={(ids) => void handleSubmit(ids)}
        formData={formData}
        editandoId={ofertaEditando?.idOferta ?? null}
        guardando={guardando}
        errores={error ? [error] : []}
        onInputChange={handleInputChange}
      />
    </div>
  );
}

export default Oferta;
