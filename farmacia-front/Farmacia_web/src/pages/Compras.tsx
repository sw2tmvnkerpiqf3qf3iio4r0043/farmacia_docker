import { useEffect, useMemo, useState } from "react";
import PanelContenido from "../components/PanelContenido";
import { useMedicamentos } from "../context/MedicamentoContext";
import { getProveedores } from "../api/apiProveedor";
import { getLotes } from "../api/apiLote";
import {
  cambiarEstadoCompra,
  crearCompra,
  getCompra,
  getCompras,
} from "../api/apiCompra";
import { getApiErrorMessage } from "../api/apiErrors";
import type { Compra, Lote, Proveedor } from "../types/farmacia";

interface LineaCompra {
  idMedicamento: string;
  modoLote: "nuevo" | "existente";
  idLote: string;
  numeroLote: string;
  fechaFabricacion: string;
  fechaVencimiento: string;
  cantidad: string;
  precioUnitario: string;
}

const ESTADO_COLORES: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  completada: "bg-green-100 text-green-700",
  devuelta_parcial: "bg-orange-100 text-orange-700",
  devuelta_total: "bg-red-100 text-red-700",
};

function fechaISO(anio: number, mes: number, dia: number) {
  return new Date(anio, mes, dia).toISOString().slice(0, 10);
}

function nuevaLinea(): LineaCompra {
  const hoy = new Date();
  return {
    idMedicamento: "",
    modoLote: "nuevo",
    idLote: "",
    numeroLote: "",
    fechaFabricacion: fechaISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()),
    fechaVencimiento: fechaISO(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate()),
    cantidad: "1",
    precioUnitario: "",
  };
}

function formatearFecha(fecha: string) {
  if (!fecha) return "-";
  const date = new Date(`${fecha.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleDateString("es-BO", { dateStyle: "medium" });
}

function Compras() {
  const { medicamentos } = useMedicamentos();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState<Compra | null>(null);

  const [idProveedor, setIdProveedor] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaCompra, setFechaCompra] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [estado, setEstado] = useState<"pendiente" | "completada">("completada");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<LineaCompra[]>([nuevaLinea()]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");
      const [comprasData, proveedoresData, lotesData] = await Promise.all([
        getCompras(),
        getProveedores(),
        getLotes(),
      ]);
      setCompras(comprasData);
      setProveedores(proveedoresData.filter((p) => p.activo));
      setLotes(lotesData);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar las compras"));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const medicamentosActivos = useMemo(
    () => medicamentos.filter((med) => med.activo),
    [medicamentos]
  );

  const total = useMemo(
    () =>
      Number(
        lineas
          .reduce(
            (acc, linea) =>
              acc + Number(linea.cantidad || 0) * Number(linea.precioUnitario || 0),
            0
          )
          .toFixed(2)
      ),
    [lineas]
  );

  const abrirModal = () => {
    setIdProveedor(proveedores[0] ? String(proveedores[0].idProveedor) : "");
    setNumeroFactura("");
    setFechaCompra(new Date().toISOString().slice(0, 10));
    setEstado("completada");
    setObservaciones("");
    setLineas([nuevaLinea()]);
    setError("");
    setModalAbierto(true);
  };

  const actualizarLinea = (index: number, cambios: Partial<LineaCompra>) => {
    setLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, ...cambios } : linea))
    );
  };

  const guardarCompra = async () => {
    setError("");

    if (!idProveedor) {
      setError("Selecciona un proveedor.");
      return;
    }
    if (!numeroFactura.trim()) {
      setError("Ingresa el número de factura.");
      return;
    }

    const detalles = [];
    for (const linea of lineas) {
      const idMedicamento = Number(linea.idMedicamento);
      const cantidad = Number(linea.cantidad);
      const precioUnitario = Number(linea.precioUnitario);

      if (!idMedicamento) {
        setError("Selecciona el medicamento de cada línea.");
        return;
      }
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setError("La cantidad debe ser un entero mayor a 0.");
        return;
      }
      if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
        setError("El precio unitario debe ser un número válido.");
        return;
      }

      if (linea.modoLote === "existente") {
        if (!linea.idLote) {
          setError("Selecciona el lote existente de cada línea.");
          return;
        }
        detalles.push({
          idMedicamento,
          idLote: Number(linea.idLote),
          cantidad,
          precioUnitario,
        });
      } else {
        if (!linea.numeroLote.trim()) {
          setError("Ingresa el número del nuevo lote.");
          return;
        }
        if (!linea.fechaFabricacion || !linea.fechaVencimiento) {
          setError("Completa las fechas del nuevo lote.");
          return;
        }
        if (linea.fechaVencimiento <= linea.fechaFabricacion) {
          setError("La fecha de vencimiento debe ser posterior a la fecha de fabricación.");
          return;
        }
        detalles.push({
          idMedicamento,
          nuevoLote: {
            idProveedor: Number(idProveedor),
            numeroLote: linea.numeroLote.trim(),
            fechaFabricacion: linea.fechaFabricacion,
            fechaVencimiento: linea.fechaVencimiento,
          },
          cantidad,
          precioUnitario,
        });
      }
    }

    try {
      setGuardando(true);
      await crearCompra({
        idProveedor: Number(idProveedor),
        numeroFactura: numeroFactura.trim(),
        fechaCompra,
        estado,
        observaciones: observaciones || undefined,
        detalles,
      });
      setModalAbierto(false);
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo registrar la compra"));
    } finally {
      setGuardando(false);
    }
  };

  const verDetalle = async (idCompra: number) => {
    try {
      setDetalle(await getCompra(idCompra));
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo cargar el detalle"));
    }
  };

  const recibirCompra = async (idCompra: number) => {
    if (!window.confirm("¿Recibir esta compra e ingresar los productos al inventario?")) return;
    try {
      await cambiarEstadoCompra(idCompra, "completada");
      await cargarDatos();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo recibir la compra"));
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-gray-600">Cargando compras...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📥 Gestión de Compras</h1>
          <p className="text-gray-600 mt-1">Registra compras, lotes e ingresos al inventario</p>
        </div>
        <button
          onClick={abrirModal}
          disabled={proveedores.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
        >
          <i className="fa-solid fa-plus"></i>
          Nueva Compra
        </button>
      </div>

      {proveedores.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4">
          No hay proveedores activos. Registra un proveedor antes de crear una compra.
        </div>
      )}

      {error && !modalAbierto && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      )}

      <PanelContenido titulo={`Historial de compras (${compras.length})`} colSpan={3}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Compra</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Factura</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {compras.map((compra) => (
                <tr key={compra.idCompra} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-3 font-bold text-gray-900">#{compra.idCompra}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{compra.numeroFactura}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{compra.proveedor}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatearFecha(compra.fechaCompra)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">Bs. {compra.totalCompra.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_COLORES[compra.estado] || "bg-gray-100 text-gray-700"}`}>
                      {compra.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => verDetalle(compra.idCompra)}
                        className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition"
                      >
                        Detalle
                      </button>
                      {compra.estado === "pendiente" && (
                        <button
                          onClick={() => recibirCompra(compra.idCompra)}
                          className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-semibold transition"
                        >
                          Recibir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {compras.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">Aún no hay compras registradas.</p>
            </div>
          )}
        </div>
      </PanelContenido>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Nueva Compra</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Cada producto necesita un lote existente o uno nuevo
                </p>
              </div>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Proveedor</label>
                  <select
                    value={idProveedor}
                    onChange={(e) => setIdProveedor(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {proveedores.map((proveedor) => (
                      <option key={proveedor.idProveedor} value={proveedor.idProveedor}>
                        {proveedor.nombreEmpresa}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">N° factura</label>
                  <input
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    placeholder="FAC-001"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fechaCompra}
                    onChange={(e) => setFechaCompra(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
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
                    const lotesMedicamento = lotes.filter(
                      (lote) => lote.idMedicamento === Number(linea.idMedicamento)
                    );
                    const med = medicamentosActivos.find(
                      (m) => m.idMedicamento === Number(linea.idMedicamento)
                    );
                    return (
                      <div key={index} className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                          <div className="md:col-span-4">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Medicamento</label>
                            <select
                              value={linea.idMedicamento}
                              onChange={(e) =>
                                actualizarLinea(index, {
                                  idMedicamento: e.target.value,
                                  idLote: "",
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                            >
                              <option value="">Seleccionar...</option>
                              {medicamentosActivos.map((m) => (
                                <option key={m.idMedicamento} value={m.idMedicamento}>
                                  {m.nombreComercial}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Cantidad</label>
                            <input
                              type="number"
                              min="1"
                              value={linea.cantidad}
                              onChange={(e) => actualizarLinea(index, { cantidad: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Precio unit.</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={linea.precioUnitario}
                              onChange={(e) => actualizarLinea(index, { precioUnitario: e.target.value })}
                              placeholder="0.00"
                              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Lote</label>
                            <select
                              value={linea.modoLote}
                              onChange={(e) =>
                                actualizarLinea(index, {
                                  modoLote: e.target.value as "nuevo" | "existente",
                                  idLote: "",
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                            >
                              <option value="nuevo">Nuevo lote</option>
                              <option value="existente">Existente</option>
                            </select>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-xs text-gray-500">Subtotal</p>
                            <p className="font-bold text-sm text-gray-900">
                              Bs. {(Number(linea.cantidad || 0) * Number(linea.precioUnitario || 0)).toFixed(2)}
                            </p>
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

                        {linea.modoLote === "nuevo" ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">N° de lote</label>
                              <input
                                value={linea.numeroLote}
                                onChange={(e) => actualizarLinea(index, { numeroLote: e.target.value })}
                                placeholder={med ? `LOTE-${med.idMedicamento}` : "LOTE-001"}
                                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Fabricación</label>
                              <input
                                type="date"
                                value={linea.fechaFabricacion}
                                onChange={(e) => actualizarLinea(index, { fechaFabricacion: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Vencimiento</label>
                              <input
                                type="date"
                                value={linea.fechaVencimiento}
                                onChange={(e) => actualizarLinea(index, { fechaVencimiento: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Lote existente</label>
                            <select
                              value={linea.idLote}
                              onChange={(e) => actualizarLinea(index, { idLote: e.target.value })}
                              disabled={!linea.idMedicamento}
                              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white disabled:bg-gray-100"
                            >
                              <option value="">
                                {linea.idMedicamento
                                  ? "Seleccionar lote..."
                                  : "Primero selecciona el medicamento"}
                              </option>
                              {lotesMedicamento.map((lote) => (
                                <option key={lote.idLote} value={lote.idLote}>
                                  {lote.numeroLote} · vence {formatearFecha(lote.fechaVencimiento)}
                                </option>
                              ))}
                            </select>
                            {linea.idMedicamento && lotesMedicamento.length === 0 && (
                              <p className="text-xs text-orange-600 mt-1">
                                Este medicamento no tiene lotes. Usa la opción “Nuevo lote”.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as "pendiente" | "completada")}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="completada">Completada (ingresa inventario)</option>
                    <option value="pendiente">Pendiente (recibir después)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
                  <input
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-gray-600 font-semibold">Total de la compra</span>
                <span className="text-2xl font-bold text-green-700">Bs. {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={guardarCompra}
                disabled={guardando}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition"
              >
                {guardando ? "Registrando..." : "Registrar Compra"}
              </button>
              <button
                onClick={() => setModalAbierto(false)}
                className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg font-semibold transition"
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
                <h3 className="text-xl font-bold text-gray-900">
                  Compra #{detalle.idCompra} · {detalle.numeroFactura}
                </h3>
                <p className="text-sm text-gray-500">
                  {detalle.proveedor} · {formatearFecha(detalle.fechaCompra)}
                </p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {(detalle.detalles || []).map((item) => (
                  <div key={item.idDetalleCompra} className="flex justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{item.medicamento}</p>
                      <p className="text-xs text-gray-500">
                        Lote {item.numeroLote || "sin lote"} · {item.cantidad} x Bs. {item.precioUnitario.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">Bs. {item.subtotal.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado</span>
                  <span className="font-semibold">{detalle.estado}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="font-bold">Bs. {detalle.totalCompra.toFixed(2)}</span>
                </div>
                {detalle.observaciones && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Observaciones</span>
                    <span className="text-right">{detalle.observaciones}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Compras;
