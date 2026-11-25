import { useCallback, useEffect, useMemo, useState } from "react";
import PanelContenido from "../components/PanelContenido";
import { useMedicamentos } from "../context/useMedicamentos";
import { getClientes } from "../api/apiCliente";
import { anularVenta, crearVenta, getMetodosPago, getVenta } from "../api/apiVenta";
import apiClient from "../api/apiClient";
import { getApiErrorMessage } from "../api/apiErrors";
import type { Cliente, MetodoPago, Venta } from "../types/farmacia";

interface LineaVenta {
  idMedicamento: string;
  cantidad: string;
  idReceta: string;
}

interface FiltrosVenta {
  estado: string;
  desde: string;
  hasta: string;
}

type EstadoGestionable = "pendiente" | "en_camino" | "completada";

const OPCIONES_ESTADO: Array<{ valor: EstadoGestionable; etiqueta: string }> = [
  { valor: "pendiente", etiqueta: "Pendiente" },
  { valor: "en_camino", etiqueta: "En camino" },
  { valor: "completada", etiqueta: "Completado" },
];

const ESTADO_COLORES: Record<string, string> = {
  completada: "bg-green-100 text-green-700",
  completado: "bg-green-100 text-green-700",
  pendiente: "bg-yellow-100 text-yellow-700",
  en_camino: "bg-blue-100 text-blue-700",
  "en camino": "bg-blue-100 text-blue-700",
  anulada: "bg-red-100 text-red-700",
  devuelta_parcial: "bg-orange-100 text-orange-700",
  devuelta_total: "bg-red-100 text-red-700",
};

function formatearFecha(fecha: string) {
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha || "—";
  return date.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" });
}

function nuevaLinea(): LineaVenta {
  return { idMedicamento: "", cantidad: "1", idReceta: "" };
}

function normalizarEstado(estado: string): string {
  const valor = String(estado ?? "").toLowerCase().trim().replaceAll(" ", "_");
  if (valor === "completado") return "completada";
  return valor;
}

function etiquetaEstado(estado: string): string {
  const valor = normalizarEstado(estado);
  if (valor === "en_camino") return "En camino";
  if (valor === "completada") return "Completado";
  if (valor === "pendiente") return "Pendiente";
  if (valor === "anulada") return "Anulada";
  if (valor === "devuelta_parcial") return "Devuelta parcial";
  if (valor === "devuelta_total") return "Devuelta total";
  return estado || "Desconocido";
}

function colorEstado(estado: string): string {
  return ESTADO_COLORES[normalizarEstado(estado)] ?? "bg-gray-100 text-gray-700";
}

function esEstadoGestionable(estado: string): estado is EstadoGestionable {
  return ["pendiente", "en_camino", "completada"].includes(normalizarEstado(estado));
}

function metodoPagoVenta(venta: Venta): string {
  const extra = venta as Venta & {
    metodoPago?: string;
    metodo_pago?: string;
    nombreMetodoPago?: string;
  };
  return (
    extra.metodoPago ||
    extra.metodo_pago ||
    extra.nombreMetodoPago ||
    venta.pagos?.[0]?.metodoPago ||
    "—"
  );
}

function extraerVentas(data: unknown): Venta[] {
  if (Array.isArray(data)) return data as Venta[];
  if (data && typeof data === "object") {
    const objeto = data as { ventas?: unknown; data?: unknown };
    if (Array.isArray(objeto.ventas)) return objeto.ventas as Venta[];
    if (Array.isArray(objeto.data)) return objeto.data as Venta[];
  }
  return [];
}

function filtrarVentas(ventas: Venta[], filtros: FiltrosVenta): Venta[] {
  return ventas.filter((venta) => {
    const estado = normalizarEstado(venta.estado);
    const fecha = String(venta.fechaVenta ?? "").slice(0, 10);
    if (filtros.estado && estado !== filtros.estado) return false;
    if (filtros.desde && (!fecha || fecha < filtros.desde)) return false;
    if (filtros.hasta && (!fecha || fecha > filtros.hasta)) return false;
    return true;
  });
}

function Ventas() {
  const { medicamentos } = useMedicamentos();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoAuxiliares, setCargandoAuxiliares] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState("");
  const [notificacion, setNotificacion] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState<Venta | null>(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [idCliente, setIdCliente] = useState("");
  const [idMetodoPago, setIdMetodoPago] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<LineaVenta[]>([nuevaLinea()]);

  const filtros = useMemo<FiltrosVenta>(
    () => ({ estado: filtroEstado, desde, hasta }),
    [filtroEstado, desde, hasta]
  );

  const cargarVentas = useCallback(async (filtrosActuales: FiltrosVenta) => {
    const params: Record<string, string> = {};
    if (filtrosActuales.estado) params.estado = filtrosActuales.estado;
    if (filtrosActuales.desde) params.desde = filtrosActuales.desde;
    if (filtrosActuales.hasta) params.hasta = filtrosActuales.hasta;

    try {
      setCargando(true);
      setError("");
      let respuesta;
      try {
        respuesta = await apiClient.get("/venta", { params });
      } catch {
        respuesta = await apiClient.get("/venta");
      }
      setVentas(filtrarVentas(extraerVentas(respuesta.data), filtrosActuales));
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar las ventas."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    const cargarAuxiliares = async () => {
      try {
        const [clientesData, metodosData] = await Promise.all([
          getClientes(),
          getMetodosPago(),
        ]);
        if (!activo) return;
        setClientes(clientesData);
        setMetodos(metodosData);
        if (metodosData.length > 0) setIdMetodoPago(String(metodosData[0].idMetodoPago));
      } catch (err) {
        if (activo) setError(getApiErrorMessage(err, "No se pudieron cargar los datos auxiliares."));
      } finally {
        if (activo) setCargandoAuxiliares(false);
      }
    };
    void cargarAuxiliares();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    void cargarVentas(filtros);
  }, [cargarVentas, filtros]);

  useEffect(() => {
    if (!notificacion) return;
    const temporizador = window.setTimeout(() => setNotificacion(""), 4000);
    return () => window.clearTimeout(temporizador);
  }, [notificacion]);

  const medicamentosActivos = useMemo(
    () => medicamentos.filter((med) => med.activo),
    [medicamentos]
  );

  const total = useMemo(
    () =>
      Number(
        lineas
          .reduce((acc, linea) => {
            const med = medicamentosActivos.find(
              (item) => item.idMedicamento === Number(linea.idMedicamento)
            );
            return acc + Number(med?.precioVenta || 0) * Number(linea.cantidad || 0);
          }, 0)
          .toFixed(2)
      ),
    [lineas, medicamentosActivos]
  );

  const abrirModal = () => {
    setError("");
    setIdCliente("");
    setObservaciones("");
    setLineas([nuevaLinea()]);
    if (metodos.length > 0) setIdMetodoPago(String(metodos[0].idMetodoPago));
    setModalAbierto(true);
  };

  const actualizarLinea = (index: number, cambios: Partial<LineaVenta>) => {
    setLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, ...cambios } : linea))
    );
  };

  const guardarVenta = async () => {
    setError("");
    if (lineas.some((linea) => !linea.idMedicamento || Number(linea.cantidad) <= 0)) {
      setError("Completa el producto y la cantidad de cada línea.");
      return;
    }
    if (!idMetodoPago) {
      setError("Selecciona un método de pago.");
      return;
    }

    const detalles = [];
    for (const linea of lineas) {
      const idMedicamento = Number(linea.idMedicamento);
      const med = medicamentosActivos.find((item) => item.idMedicamento === idMedicamento);
      if (!med) {
        setError("Uno de los productos seleccionados ya no está disponible.");
        return;
      }
      if (Number(linea.cantidad) > med.stock) {
        setError(`Stock insuficiente de ${med.nombreComercial}. Disponible: ${med.stock}.`);
        return;
      }
      if (med.requiereReceta && !linea.idReceta) {
        setError(`${med.nombreComercial} requiere receta. Ingresa el ID de la receta.`);
        return;
      }
      detalles.push({
        idMedicamento,
        cantidad: Number(linea.cantidad),
        ...(med.requiereReceta && linea.idReceta
          ? { idReceta: Number(linea.idReceta), recetaPresentada: true }
          : {}),
      });
    }

    try {
      setGuardando(true);
      await crearVenta({
        idCliente: idCliente ? Number(idCliente) : null,
        estado: "completada",
        observaciones: observaciones || undefined,
        detalles,
        pagos: [
          {
            idMetodoPago: Number(idMetodoPago),
            monto: total,
            estadoPago: "confirmado",
          },
        ],
      });
      setModalAbierto(false);
      setNotificacion("Venta registrada correctamente.");
      await cargarVentas(filtros);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo registrar la venta."));
    } finally {
      setGuardando(false);
    }
  };

  const verDetalle = async (idVenta: number) => {
    try {
      setCargandoDetalle(true);
      setError("");
      const venta = await getVenta(idVenta);
      setDetalle(venta);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo cargar el detalle de la venta."));
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cambiarEstado = async (venta: Venta, estado: EstadoGestionable) => {
    try {
      setError("");
      await apiClient.patch(`/venta/${venta.idVenta}/estado`, { estado });
      setVentas((prev) =>
        prev.map((item) => (item.idVenta === venta.idVenta ? { ...item, estado } : item))
      );
      setDetalle((prev) =>
        prev && prev.idVenta === venta.idVenta ? { ...prev, estado } : prev
      );
      setNotificacion(`Estado actualizado a ${etiquetaEstado(estado).toLowerCase()}.`);
      if (filtroEstado && filtroEstado !== estado) {
        await cargarVentas(filtros);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo actualizar el estado."));
    }
  };

  const anular = async (idVenta: number) => {
    const motivo = window.prompt("Motivo de anulación (opcional):");
    if (motivo === null) return;
    try {
      setError("");
      await anularVenta(idVenta, motivo || undefined);
      setNotificacion("Venta anulada correctamente.");
      await cargarVentas(filtros);
      setDetalle((prev) => (prev && prev.idVenta === idVenta ? { ...prev, estado: "anulada" } : prev));
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo anular la venta."));
    }
  };

  const limpiarFiltros = () => {
    setFiltroEstado("");
    setDesde("");
    setHasta("");
  };

  if (cargando && cargandoAuxiliares) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-gray-600">Cargando ventas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de ventas</h1>
          <p className="text-gray-600 mt-1">Historial, estados y detalles de ventas</p>
        </div>
        <button
          onClick={abrirModal}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          + Nueva venta
        </button>
      </div>

      {notificacion && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
          {notificacion}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos</option>
              {OPCIONES_ESTADO.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
              <option value="anulada">Anulada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={limpiarFiltros}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-semibold"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <PanelContenido titulo={`Historial de ventas (${ventas.length})`} colSpan={3}>
        {cargando ? (
          <p className="text-center py-8 text-gray-500">Actualizando ventas...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Venta</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Método de pago</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ventas.map((venta) => {
                  const estado = normalizarEstado(venta.estado);
                  return (
                    <tr key={venta.idVenta} className="hover:bg-blue-50 transition">
                      <td className="px-4 py-3 font-bold text-gray-900">#{venta.idVenta}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatearFecha(venta.fechaVenta)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {venta.cliente || "Consumidor final"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        Bs. {Number(venta.totalVenta ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{metodoPagoVenta(venta)}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${colorEstado(estado)}`}
                          >
                            {etiquetaEstado(estado)}
                          </span>
                          {esEstadoGestionable(estado) && (
                            <select
                              value={estado as EstadoGestionable}
                              onChange={(e) =>
                                void cambiarEstado(venta, e.target.value as EstadoGestionable)
                              }
                              className="block w-full border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white"
                              aria-label={`Cambiar estado de la venta ${venta.idVenta}`}
                            >
                              {OPCIONES_ESTADO.map((opcion) => (
                                <option key={opcion.valor} value={opcion.valor}>
                                  {opcion.etiqueta}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2 flex-wrap">
                          <button
                            onClick={() => void verDetalle(venta.idVenta)}
                            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold"
                          >
                            Detalle
                          </button>
                          {!["anulada", "devuelta_total"].includes(estado) && (
                            <button
                              onClick={() => void anular(venta.idVenta)}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold"
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ventas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay ventas que coincidan con los filtros.
              </div>
            )}
          </div>
        )}
      </PanelContenido>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Nueva venta</h2>
                <p className="text-sm text-gray-600 mt-1">Completa los productos y el pago</p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
                title="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente</label>
                  <select
                    value={idCliente}
                    onChange={(e) => setIdCliente(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Consumidor final</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.idCliente} value={cliente.idCliente}>
                        {cliente.nombre} ({cliente.ci})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Método de pago
                  </label>
                  <select
                    value={idMetodoPago}
                    onChange={(e) => setIdMetodoPago(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {metodos.map((metodo) => (
                      <option key={metodo.idMetodoPago} value={metodo.idMetodoPago}>
                        {metodo.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Productos</label>
                  <button
                    type="button"
                    onClick={() => setLineas((prev) => [...prev, nuevaLinea()])}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Agregar producto
                  </button>
                </div>
                <div className="space-y-3">
                  {lineas.map((linea, index) => {
                    const med = medicamentosActivos.find(
                      (item) => item.idMedicamento === Number(linea.idMedicamento)
                    );
                    const subtotal =
                      Number(med?.precioVenta || 0) * Number(linea.cantidad || 0);
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="md:col-span-5">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Medicamento
                          </label>
                          <select
                            value={linea.idMedicamento}
                            onChange={(e) =>
                              actualizarLinea(index, { idMedicamento: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                          >
                            <option value="">Seleccionar...</option>
                            {medicamentosActivos.map((item) => (
                              <option key={item.idMedicamento} value={item.idMedicamento}>
                                {item.nombreComercial} (Stock: {item.stock})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={linea.cantidad}
                            onChange={(e) => actualizarLinea(index, { cantidad: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            ID receta
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={linea.idReceta}
                            onChange={(e) => actualizarLinea(index, { idReceta: e.target.value })}
                            placeholder={med?.requiereReceta ? "Requerido" : "Opcional"}
                            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-500">Subtotal</p>
                          <p className="font-bold text-gray-900">Bs. {subtotal.toFixed(2)}</p>
                        </div>
                        <div className="md:col-span-1">
                          <button
                            type="button"
                            onClick={() =>
                              setLineas((prev) =>
                                prev.length === 1 ? [nuevaLinea()] : prev.filter((_, i) => i !== index)
                              )
                            }
                            className="w-full bg-red-100 hover:bg-red-200 text-red-700 rounded-lg py-2 text-sm font-bold"
                            title="Quitar"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-gray-600 font-semibold">Total</span>
                <span className="text-2xl font-bold text-green-700">Bs. {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => void guardarVenta()}
                disabled={guardando || cargandoAuxiliares}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold"
              >
                {guardando ? "Registrando..." : "Registrar venta"}
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

      {detalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Venta #{detalle.idVenta}</h3>
                <p className="text-sm text-gray-500">{formatearFecha(detalle.fechaVenta)}</p>
              </div>
              <button
                onClick={() => setDetalle(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
                title="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {cargandoDetalle ? (
                <p className="text-gray-600">Cargando detalle...</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${colorEstado(detalle.estado)}`}
                    >
                      {etiquetaEstado(detalle.estado)}
                    </span>
                    <span className="text-gray-600">
                      Método de pago: <strong>{metodoPagoVenta(detalle)}</strong>
                    </span>
                  </div>
                  <div className="space-y-2">
                    {(detalle.detalles || []).map((item) => (
                      <div
                        key={item.idDetalleVenta}
                        className="flex justify-between gap-4 p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{item.medicamento}</p>
                          <p className="text-xs text-gray-500">
                            Lote {item.numeroLote} · {item.cantidad} x Bs.{" "}
                            {Number(item.precioUnitario ?? 0).toFixed(2)}
                          </p>
                        </div>
                        <p className="font-bold text-gray-900">
                          Bs. {Number(item.subtotal ?? 0).toFixed(2)}
                        </p>
                      </div>
                    ))}
                    {(detalle.detalles || []).length === 0 && (
                      <p className="text-sm text-gray-500">Sin líneas de detalle.</p>
                    )}
                  </div>
                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cliente</span>
                      <span className="font-semibold">
                        {detalle.cliente || "Consumidor final"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total</span>
                      <span className="font-bold">Bs. {Number(detalle.totalVenta ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pagado</span>
                      <span className="font-semibold text-green-700">
                        Bs. {Number(detalle.totalPagado ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saldo</span>
                      <span className="font-semibold">Bs. {Number(detalle.saldo ?? 0).toFixed(2)}</span>
                    </div>
                    {detalle.observaciones && (
                      <div className="pt-2 text-gray-600">
                        Observaciones: {detalle.observaciones}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ventas;
