import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMisCompras, getVenta, getVentasCliente } from "../api/apiVenta";
import { getApiErrorMessage } from "../api/apiErrors";
import type { UserSession, Venta } from "../types/farmacia";

function leerUsuario(): UserSession | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

const ESTADO_COLORES: Record<string, string> = {
  completada: "bg-green-100 text-green-700",
  pendiente: "bg-yellow-100 text-yellow-700",
  en_camino: "bg-blue-100 text-blue-700",
  anulada: "bg-red-100 text-red-700",
  devuelta_parcial: "bg-orange-100 text-orange-700",
  devuelta_total: "bg-red-100 text-red-700",
};

const ESTADO_LABEL: Record<string, string> = {
  completada: "Completado",
  pendiente: "Pendiente",
  en_camino: "En camino",
  anulada: "Anulado",
  devuelta_parcial: "Devuelta parcial",
  devuelta_total: "Devuelta total",
};

function formatearFecha(fecha: string) {
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" });
}

function obtenerUbicacionTexto(venta: Venta): string {
  const u = venta.ubicacion;
  if (!u) return "—";
  if (typeof u === "string") return u;
  const nombre =
    (typeof u.nombre === "string" ? u.nombre : undefined) ??
    (typeof u.direccion === "string" ? u.direccion : undefined) ??
    "";
  const sucursal = u.sucursal;
  const suc =
    (typeof sucursal === "string" ? sucursal : undefined) ??
    (sucursal && typeof sucursal === "object" && typeof sucursal.nombre === "string"
      ? sucursal.nombre
      : undefined) ??
    (typeof u.nombreSucursal === "string" ? u.nombreSucursal : undefined) ??
    "";
  return [nombre, suc].filter(Boolean).join(" · ") || "—";
}

function MisPedidos() {
  const usuario = leerUsuario();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState<Venta | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        try {
          const data = await getMisCompras();
          setVentas(Array.isArray(data) ? data : []);
        } catch {
          if (!usuario?.idCliente) {
            setError("Tu cuenta no tiene una ficha de cliente asociada.");
            setVentas([]);
          } else {
            const data = await getVentasCliente(usuario.idCliente);
            setVentas(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        setError(getApiErrorMessage(err, "No se pudieron cargar tus pedidos"));
      } finally {
        setCargando(false);
      }
    };
    void cargar();
  }, [usuario?.idCliente]);

  const verDetalle = async (idVenta: number) => {
    try {
      setCargandoDetalle(true);
      setDetalle(await getVenta(idVenta));
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo cargar el detalle"));
    } finally {
      setCargandoDetalle(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-gray-600">Cargando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Mis Pedidos</h2>
        <p className="text-gray-600 mt-1">Consulta el estado y detalle de tus compras</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>}

      {!error && ventas.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-xl font-semibold text-gray-700">Aún no tienes pedidos</p>
          <Link to="/catalogo" className="inline-block mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition">
            Ver catálogo
          </Link>
        </div>
      )}

      {ventas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Ubicación</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ventas.map((venta) => (
                  <tr key={venta.idVenta} className="hover:bg-blue-50 transition">
                    <td className="px-4 py-3 font-bold text-gray-900">#{venta.idVenta}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatearFecha(venta.fechaVenta)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">Bs. {Number(venta.totalVenta).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_COLORES[venta.estado] || "bg-gray-100 text-gray-700"}`}>
                        {ESTADO_LABEL[venta.estado] || venta.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{obtenerUbicacionTexto(venta)}</td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" onClick={() => verDetalle(venta.idVenta)} className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition">
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Pedido #{detalle.idVenta}</h3>
                <p className="text-sm text-gray-500">{formatearFecha(detalle.fechaVenta)}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${ESTADO_COLORES[detalle.estado] || "bg-gray-100 text-gray-700"}`}>
                  {ESTADO_LABEL[detalle.estado] || detalle.estado}
                </span>
              </div>
              <button onClick={() => setDetalle(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              {cargandoDetalle ? (
                <p className="text-gray-600">Cargando detalle...</p>
              ) : (
                <>
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold">Ubicación:</span> {obtenerUbicacionTexto(detalle)}
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900">Productos</h4>
                    {(detalle.detalles || []).map((item) => (
                      <div key={item.idDetalleVenta} className="flex justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900">{item.medicamento}</p>
                          <p className="text-xs text-gray-500">
                            {item.cantidad} unidad(es) · Bs. {Number(item.precioUnitario).toFixed(2)}
                            {item.recetaPresentada ? " · Receta presentada" : ""}
                          </p>
                          {item.idReceta && <p className="text-xs text-blue-700">Receta #{item.idReceta}</p>}
                        </div>
                        <p className="font-bold text-gray-900">Bs. {Number(item.subtotal).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  {(detalle.pagos || []).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900">Pagos</h4>
                      {(detalle.pagos || []).map((pago) => (
                        <div key={pago.idPago} className="flex justify-between items-center p-3 bg-green-50 rounded-lg text-sm">
                          <div>
                            <p className="font-semibold text-gray-900">{pago.metodoPago || `Método #${pago.idMetodoPago}`}</p>
                            <p className="text-xs text-gray-500">{pago.estadoPago}{pago.referencia ? ` · Ref: ${pago.referencia}` : ""}</p>
                          </div>
                          <p className="font-bold text-gray-900">Bs. {Number(pago.monto).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-bold">Bs. {Number(detalle.totalVenta).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Pagado</span><span className="font-semibold text-green-700">Bs. {Number(detalle.totalPagado ?? 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Saldo</span><span className="font-semibold">Bs. {Number(detalle.saldo ?? 0).toFixed(2)}</span></div>
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

export default MisPedidos;
