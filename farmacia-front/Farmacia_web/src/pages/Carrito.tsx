import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/useCart";
import { crearVenta, getMetodosPago } from "../api/apiVenta";
import { getApiErrorMessage } from "../api/apiErrors";
import apiClient from "../api/apiClient";
import { crearRecetaMia, subirArchivoReceta } from "../api/apiReceta";
import type { MetodoPago, UserSession } from "../types/farmacia";
import { buildImageUrl } from "../utils/buildImageUrl";

interface Ubicacion {
  idUbicacion: number;
  nombre: string;
  direccion?: string;
  sucursal?: string;
}

interface RawSucursal {
  [key: string]: unknown;
  nombre?: string;
}

interface RawUbicacion {
  [key: string]: unknown;
  idUbicacion?: number | string | null;
  id_ubicacion?: number | string | null;
  id?: number | string | null;
  nombre?: string | null;
  direccion?: string | null;
  detalle?: string | null;
  descripcion?: string | null;
  sucursal?: RawSucursal | string | null;
  nombreSucursal?: string | null;
  nombre_sucursal?: string | null;
}

function leerUsuario(): UserSession | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

function normalizarUbicacion(raw: RawUbicacion): Ubicacion {
  const sucursalObj = raw.sucursal && typeof raw.sucursal === "object" ? raw.sucursal : null;
  const sucursal =
    sucursalObj?.nombre ??
    (typeof raw.sucursal === "string" ? raw.sucursal : undefined) ??
    raw.nombreSucursal ??
    raw.nombre_sucursal ??
    "";
  const id = raw.idUbicacion ?? raw.id_ubicacion ?? raw.id;
  const nombre = String(
    raw.nombre ??
      raw.direccion ??
      raw.descripcion ??
      (sucursal ? `Sucursal ${sucursal}` : `Ubicación ${id ?? ""}`)
  );
  return {
    idUbicacion: id === undefined || id === null || id === "" ? 0 : Number(id),
    nombre,
    direccion: raw.direccion ?? raw.detalle ?? undefined,
    sucursal: sucursal || undefined,
  };
}

function Carrito() {
  const { items, total, updateCantidad, removeItem, clearCart } = useCart();
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [idMetodoPago, setIdMetodoPago] = useState("");
  const [idUbicacion, setIdUbicacion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [ventaCreada, setVentaCreada] = useState<number | null>(null);
  const [usuario, setUsuario] = useState<UserSession | null>(leerUsuario());

  const [archivoReceta, setArchivoReceta] = useState<File | null>(null);
  const [previewReceta, setPreviewReceta] = useState<string>("");
  const [subiendoReceta, setSubiendoReceta] = useState(false);
  const [idReceta, setIdReceta] = useState<number | null>(null);
  const [recetaForm, setRecetaForm] = useState({
    numeroReceta: "",
    medicoPrescriptor: "",
    fechaEmision: "",
    fechaVencimiento: "",
  });

  const requiereReceta = useMemo(() => items.some((i) => i.requiereReceta), [items]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [metodosData, ubicRes] = await Promise.all([
          getMetodosPago().catch(() => []),
          apiClient.get("/ubicacion").catch(() => ({ data: [] })),
        ]);
        setMetodos(metodosData);
        if (metodosData.length > 0) setIdMetodoPago(String(metodosData[0].idMetodoPago));
        const ubics = Array.isArray(ubicRes.data) ? ubicRes.data : [];
        const normalizadas = ubics.map(normalizarUbicacion).filter((u) => u.idUbicacion > 0);
        setUbicaciones(normalizadas);
        if (normalizadas.length > 0) setIdUbicacion(String(normalizadas[0].idUbicacion));
      } catch (err) {
        setError(getApiErrorMessage(err, "No se pudieron cargar datos de checkout"));
      } finally {
        setCargando(false);
      }
    };
    void cargar();
  }, []);

  useEffect(() => {
    if (!usuario?.idCliente) {
      apiClient
        .get("/auth/me")
        .then((res) => {
          if (res.data) {
            setUsuario(res.data as UserSession);
            localStorage.setItem("user", JSON.stringify(res.data));
          }
        })
        .catch(() => {});
    }
  }, [usuario?.idCliente]);

  useEffect(() => {
    return () => {
      if (previewReceta) URL.revokeObjectURL(previewReceta);
    };
  }, [previewReceta]);

  const onArchivoChange = (file: File | null) => {
    setArchivoReceta(file);
    setIdReceta(null);
    if (previewReceta) URL.revokeObjectURL(previewReceta);
    setPreviewReceta(file ? URL.createObjectURL(file) : "");
  };

  const subirYGuardarReceta = async () => {
    if (!archivoReceta) {
      setError("Selecciona una imagen de la receta.");
      return;
    }
    if (!usuario?.idCliente) {
      setError("Tu cuenta no tiene idCliente asociado. No es posible registrar la receta; contacta a la farmacia o vuelve a registrarte.");
      return;
    }
    setSubiendoReceta(true);
    setError("");
    try {
      const upload = await subirArchivoReceta(archivoReceta);
      const receta = await crearRecetaMia({
        imagenUrl: upload.url,
        numeroReceta: recetaForm.numeroReceta || undefined,
        medicoPrescriptor: recetaForm.medicoPrescriptor || undefined,
        fechaEmision: recetaForm.fechaEmision || undefined,
        fechaVencimiento: recetaForm.fechaVencimiento || undefined,
      });
      if (!receta.idReceta) throw new Error("No se recibió idReceta");
      setIdReceta(receta.idReceta);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo subir/registrar la receta"));
    } finally {
      setSubiendoReceta(false);
    }
  };

  const confirmarCompra = async () => {
    setError("");
    if (items.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }
    if (!idMetodoPago) {
      setError("Selecciona un método de pago.");
      return;
    }
    if (!idUbicacion) {
      setError("Selecciona una ubicación de envío.");
      return;
    }
    if (requiereReceta && !idReceta) {
      setError("Debes subir y registrar la receta antes de finalizar la compra.");
      return;
    }

    const clienteId = usuario?.idCliente ?? null;
    if (!clienteId) {
      setError("Tu cuenta no tiene una ficha de cliente asociada. Contacta a la farmacia.");
      return;
    }

    setEnviando(true);
    try {
      const venta = await crearVenta({
        idCliente: clienteId,
        idUbicacion: Number(idUbicacion),
        estado: "pendiente",
        observaciones: observaciones || "Pedido realizado desde la tienda online",
        detalles: items.map((item) => {
          const precioUnitario = Number(item.precioVenta);
          const precioOriginal = Number(item.precioOriginal ?? item.precioVenta);
          const descuentoLinea = Math.max(0, Number(((precioOriginal - precioUnitario) * item.cantidad).toFixed(2)));
          return {
            idMedicamento: item.idMedicamento,
            cantidad: item.cantidad,
            precioUnitario,
            descuento: descuentoLinea,
            idReceta: item.requiereReceta && idReceta ? idReceta : undefined,
            recetaPresentada: item.requiereReceta ? Boolean(idReceta) : false,
          };
        }),
        pagos: [
          {
            idMetodoPago: Number(idMetodoPago),
            monto: Number(total.toFixed(2)),
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
            Tu venta <strong>#{ventaCreada}</strong> fue registrada correctamente (estado: pendiente).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link to="/mis-pedidos" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition">
              Ver mis pedidos
            </Link>
            <Link to="/" className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-lg transition">
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
        <h2 className="text-3xl font-bold text-gray-800">Mi Carrito</h2>
        <p className="text-gray-600 mt-1">Revisa tus productos y confirma tu pedido</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <p className="text-xl font-semibold text-gray-700">Tu carrito está vacío</p>
          <p className="text-gray-500 mt-2">Agrega medicamentos desde el catálogo.</p>
          <Link to="/catalogo" className="inline-block mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition">
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Productos ({items.length})</h3>
              <div className="space-y-3">
                {items.map((item) => {
                  const precioOriginal = Number(item.precioOriginal ?? item.precioVenta);
                  const tieneDesc = precioOriginal > Number(item.precioVenta);
                  return (
                    <div key={item.idMedicamento} className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 border border-gray-200 rounded-xl">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                        {item.imagen ? (
                          <img src={buildImageUrl(item.imagen)} alt={item.nombreComercial} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">💊</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900">{item.nombreComercial}</h4>
                        <p className="text-sm text-gray-500">{item.nombreGenerico}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {tieneDesc && <span className="text-xs text-gray-400 line-through">Bs. {precioOriginal.toFixed(2)}</span>}
                          <span className="text-sm text-green-700 font-semibold">Bs. {Number(item.precioVenta).toFixed(2)} c/u</span>
                          {item.requiereReceta && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">Receta</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateCantidad(item.idMedicamento, item.cantidad - 1)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold">-</button>
                        <input
                          type="number"
                          min={1}
                          max={item.stock}
                          value={item.cantidad}
                          onChange={(e) => updateCantidad(item.idMedicamento, Number(e.target.value))}
                          className="w-14 text-center border border-gray-300 rounded-lg py-1 font-semibold"
                        />
                        <button type="button" onClick={() => updateCantidad(item.idMedicamento, item.cantidad + 1)} disabled={item.cantidad >= item.stock} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold disabled:opacity-40">+</button>
                      </div>
                      <div className="text-right min-w-28">
                        <p className="font-bold text-gray-900">Bs. {(Number(item.precioVenta) * item.cantidad).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Stock: {item.stock}</p>
                        <button type="button" onClick={() => removeItem(item.idMedicamento)} className="text-xs text-red-600 hover:text-red-700 font-semibold mt-1">Quitar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {requiereReceta && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-3">
                <h3 className="text-lg font-bold text-amber-900">Receta médica requerida</h3>
                <p className="text-sm text-amber-800">Tu carrito incluye productos que requieren receta. Debes subir y registrar la receta para finalizar la compra.</p>
                {!usuario?.idCliente && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                    Tu cuenta no tiene idCliente asociado. No es posible registrar la receta. Contacta a la farmacia o vuelve a registrarte.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" placeholder="Número de receta" value={recetaForm.numeroReceta} onChange={(e) => setRecetaForm((p) => ({ ...p, numeroReceta: e.target.value }))} className="border-2 border-amber-200 rounded-lg px-3 py-2 text-sm" />
                  <input type="text" placeholder="Médico prescriptor" value={recetaForm.medicoPrescriptor} onChange={(e) => setRecetaForm((p) => ({ ...p, medicoPrescriptor: e.target.value }))} className="border-2 border-amber-200 rounded-lg px-3 py-2 text-sm" />
                  <label className="text-sm text-gray-700">Fecha emisión<input type="date" value={recetaForm.fechaEmision} onChange={(e) => setRecetaForm((p) => ({ ...p, fechaEmision: e.target.value }))} className="mt-1 w-full border-2 border-amber-200 rounded-lg px-3 py-2 text-sm" /></label>
                  <label className="text-sm text-gray-700">Fecha vencimiento<input type="date" value={recetaForm.fechaVencimiento} onChange={(e) => setRecetaForm((p) => ({ ...p, fechaVencimiento: e.target.value }))} className="mt-1 w-full border-2 border-amber-200 rounded-lg px-3 py-2 text-sm" /></label>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <input type="file" accept="image/*" onChange={(e) => onArchivoChange(e.target.files?.[0] || null)} className="text-sm" />
                  <button type="button" onClick={subirYGuardarReceta} disabled={subiendoReceta || !archivoReceta || !usuario?.idCliente} className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-lg text-sm">
                    {subiendoReceta ? "Subiendo..." : idReceta ? "Receta registrada" : "Subir y registrar receta"}
                  </button>
                  {idReceta && <span className="text-green-700 font-semibold text-sm self-center">Receta #{idReceta} lista</span>}
                </div>
                {previewReceta && (
                  <div className="flex items-start gap-3">
                    <img src={previewReceta} alt="Vista previa receta" className="w-32 h-32 object-cover rounded-lg border border-amber-200" />
                    <button type="button" onClick={() => onArchivoChange(null)} className="text-sm text-red-600 font-semibold">Cambiar receta</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 h-fit space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Resumen del pedido</h3>
            <div className="flex justify-between text-gray-700">
              <span>Productos</span>
              <span>{items.reduce((acc, item) => acc + item.cantidad, 0)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
              <span>Total</span>
              <span>Bs. {total.toFixed(2)}</span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Método de pago</label>
              <select value={idMetodoPago} onChange={(e) => setIdMetodoPago(e.target.value)} disabled={cargando} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">Selecciona un método</option>
                {metodos.map((metodo) => (
                  <option key={metodo.idMetodoPago} value={metodo.idMetodoPago}>{metodo.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Ubicación de envío</label>
              <select value={idUbicacion} onChange={(e) => setIdUbicacion(e.target.value)} disabled={cargando} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">Selecciona una ubicación</option>
                {ubicaciones.map((u) => (
                  <option key={u.idUbicacion} value={u.idUbicacion}>
                    {u.nombre}{u.sucursal ? ` · ${u.sucursal}` : ""}{u.direccion ? ` - ${u.direccion}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
              <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Indicaciones para la entrega (opcional)" />
            </div>
            <button
              type="button"
              onClick={confirmarCompra}
              disabled={enviando || cargando || items.length === 0 || (requiereReceta && !idReceta)}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition"
            >
              {enviando ? "Confirmando..." : requiereReceta && !idReceta ? "Sube la receta para continuar" : "Finalizar compra"}
            </button>
            {requiereReceta && !idReceta && (
              <p className="text-xs text-amber-700">El botón se habilitará cuando registres la receta.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Carrito;
