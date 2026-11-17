import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PanelContenido from "../components/PanelContenido";
import { getVenta, getVentasCliente } from "../api/apiVenta";
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
  anulada: "bg-red-100 text-red-700",
  devuelta_parcial: "bg-orange-100 text-orange-700",
  devuelta_total: "bg-red-100 text-red-700",
};

function formatearFecha(fecha: string) {
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" });
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
      if (!usuario?.idCliente) {
        setError("Tu cuenta no tiene una ficha de cliente asociada.");
        setCargando(false);
        return;
      }

      try {
        setVentas(await getVentasCliente(usuario.idCliente));
      } catch (err) {
        setError(getApiErrorMessage(err, "No se pudieron cargar tus pedidos"));
      } finally {
        setCargando(false);
      }
    };

    cargar();
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
        <h2 className="text-3xl font-bold text-gray-800">📦 Mis Pedidos</h2>
        <p className="text-gray-600 mt-1">Consulta el estado y detalle de tus compras</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {error}
        </div>
      )}

      {!error && ventas.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-xl font-semibold text-gray-700">Aún no tienes pedidos</p>
          <Link
            to="/catalogo"
            className="inline-block mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Ver catálogo
          </Link>
        </div>
      )}

      {ventas.length > 0 && (
        <PanelContenido titulo={`Historial (${ventas.length})`} colSpan={3}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Pagado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ventas.map((venta) => (
                  <tr key={venta.idVenta} className="hover:bg-blue-50 transition">
                    <td className="px-4 py-3 font-bold text-gray-900">#{venta.idVenta}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatearFecha(venta.fechaVenta)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">Bs. {venta.totalVenta.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Bs. {venta.totalPagado.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_COLORES[venta.estado] || "bg-gray-100 text-gray-700"}`}>
                        {venta.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => verDetalle(venta.idVenta)}
                        className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelContenido>
      )}

      {detalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Pedido #{detalle.idVenta}</h3>
                <p className="text-sm text-gray-500">{formatearFecha(detalle.fechaVenta)}</p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {cargandoDetalle ? (
                <p className="text-gray-600">Cargando detalle...</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {(detalle.detalles || []).map((item) => (
                      <div key={item.idDetalleVenta} className="flex justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900">{item.medicamento}</p>
                          <p className="text-xs text-gray-500">Lote {item.numeroLote} · {item.cantidad} unidad(es)</p>
                        </div>
                        <p className="font-bold text-gray-900">Bs. {item.subtotal.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total</span>
                      <span className="font-bold">Bs. {detalle.totalVenta.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pagado</span>
                      <span className="font-semibold text-green-700">Bs. {detalle.totalPagado.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saldo</span>
                      <span className="font-semibold">Bs. {detalle.saldo.toFixed(2)}</span>
                    </div>
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
