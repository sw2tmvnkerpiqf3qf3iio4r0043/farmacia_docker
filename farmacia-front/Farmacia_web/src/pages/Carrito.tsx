import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PanelContenido from "../components/PanelContenido";
import { useCart } from "../context/CartContext";
import { crearVenta, getMetodosPago } from "../api/apiVenta";
import { getApiErrorMessage } from "../api/apiErrors";
import type { MetodoPago, UserSession } from "../types/farmacia";

function leerUsuario(): UserSession | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

function Carrito() {
  const { items, total, updateCantidad, removeItem, clearCart } = useCart();
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [idMetodoPago, setIdMetodoPago] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [ventaCreada, setVentaCreada] = useState<number | null>(null);
  const usuario = leerUsuario();

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await getMetodosPago();
        setMetodos(data);
        if (data.length > 0) setIdMetodoPago(String(data[0].idMetodoPago));
      } catch (err) {
        setError(getApiErrorMessage(err, "No se pudieron cargar los métodos de pago"));
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const confirmarCompra = async () => {
    setError("");

    if (items.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }
    if (!usuario?.idCliente) {
      setError("Tu cuenta no tiene una ficha de cliente asociada. Contacta a la farmacia.");
      return;
    }
    if (!idMetodoPago) {
      setError("Selecciona un método de pago.");
      return;
    }
    if (items.some((item) => item.requiereReceta)) {
      setError("Los medicamentos que requieren receta deben registrarse con una receta médica en la farmacia.");
      return;
    }

    setEnviando(true);
    try {
      const venta = await crearVenta({
        idCliente: usuario.idCliente,
        estado: "completada",
        observaciones: "Pedido realizado desde la tienda online",
        detalles: items.map((item) => ({
          idMedicamento: item.idMedicamento,
          cantidad: item.cantidad,
        })),
        pagos: [
          {
            idMetodoPago: Number(idMetodoPago),
            monto: total,
            estadoPago: "confirmado",
          },
        ],
      });
      clearCart();
      setVentaCreada(venta.idVenta);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo confirmar el pedido"));
    } finally {
      setEnviando(false);
    }
  };

  if (ventaCreada) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900">Pedido confirmado</h2>
          <p className="text-gray-600 mt-2">
            Tu venta <strong>#{ventaCreada}</strong> fue registrada correctamente.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link
              to="/mis-pedidos"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              Ver mis pedidos
            </Link>
            <Link
              to="/"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-lg transition"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">🛒 Mi Carrito</h2>
        <p className="text-gray-600 mt-1">Revisa tus productos y confirma tu pedido</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <p className="text-xl font-semibold text-gray-700">Tu carrito está vacío</p>
          <p className="text-gray-500 mt-2">Agrega medicamentos desde el catálogo.</p>
          <Link
            to="/catalogo"
            className="inline-block mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PanelContenido titulo={`Productos (${items.length})`} colSpan={2}>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.idMedicamento}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 border border-gray-200 rounded-xl"
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                      {item.imagen ? (
                        <img src={item.imagen} alt={item.nombreComercial} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">💊</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{item.nombreComercial}</h3>
                      <p className="text-sm text-gray-500">{item.nombreGenerico}</p>
                      <p className="text-sm text-green-700 font-semibold mt-1">
                        Bs. {item.precioVenta.toFixed(2)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateCantidad(item.idMedicamento, item.cantidad - 1)}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold">{item.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => updateCantidad(item.idMedicamento, item.cantidad + 1)}
                        disabled={item.cantidad >= item.stock}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right min-w-24">
                      <p className="font-bold text-gray-900">
                        Bs. {(item.precioVenta * item.cantidad).toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.idMedicamento)}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold mt-1"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </PanelContenido>
          </div>

          <PanelContenido titulo="Resumen del pedido" colSpan={1}>
            <div className="space-y-4">
              <div className="flex justify-between text-gray-700">
                <span>Productos</span>
                <span>{items.reduce((acc, item) => acc + item.cantidad, 0)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                <span>Total</span>
                <span>Bs. {total.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Método de pago
                </label>
                <select
                  value={idMetodoPago}
                  onChange={(e) => setIdMetodoPago(e.target.value)}
                  disabled={cargando}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {metodos.map((metodo) => (
                    <option key={metodo.idMetodoPago} value={metodo.idMetodoPago}>
                      {metodo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={confirmarCompra}
                disabled={enviando || cargando}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition"
              >
                {enviando ? "Confirmando..." : "Confirmar pedido"}
              </button>

              <p className="text-xs text-gray-500">
                Los medicamentos que requieren receta deben presentarse en la farmacia.
              </p>
            </div>
          </PanelContenido>
        </div>
      )}
    </div>
  );
}

export default Carrito;
