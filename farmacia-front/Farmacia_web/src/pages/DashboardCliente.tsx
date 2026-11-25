import { useEffect, useMemo, useState } from "react";
import ProductModal from "../components/ProductModal";
import ProductCard from "../components/ProductCard";
import { useMedicamentos } from "../context/useMedicamentos";
import { useCart } from "../context/useCart";
import apiClient from "../api/apiClient";
import type { CartItem } from "../types/farmacia";
import type { ProductoModalItem } from "../components/ProductModal";
import {
  extraerArreglo,
  normalizarCategoria,
  normalizarMedicamento,
  normalizarOferta,
  type CategoriaNormalizada,
  type MedicamentoNormalizado,
  type OfertaNormalizada,
  type RawCategoria,
  type RawOferta,
} from "../api/datosTienda";

function DashboardCliente() {
  const { medicamentos, cargando } = useMedicamentos();
  const { addItem } = useCart();
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [categorias, setCategorias] = useState<CategoriaNormalizada[]>([]);
  const [ofertasMap, setOfertasMap] = useState<Record<number, OfertaNormalizada>>({});
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoModalItem | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaExpandida, setCategoriaExpandida] = useState<number | null>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [catsRes, ofertasRes] = await Promise.all([
          apiClient.get("/categoria").catch(() => ({ data: [] })),
          apiClient.get("/medicamento/con-oferta").catch(() => ({ data: [] })),
        ]);
        const cats = extraerArreglo<RawCategoria>(catsRes.data);
        setCategorias(cats.map(normalizarCategoria));
        const ofertas = extraerArreglo<RawOferta>(ofertasRes.data);
        const map: Record<number, OfertaNormalizada> = {};
        ofertas.forEach((raw) => {
          const info = normalizarOferta(raw);
          if (!info.idMedicamento) return;
          map[info.idMedicamento] = info;
        });
        setOfertasMap(map);
      } catch {
        setCategorias([]);
        setOfertasMap({});
      }
    };
    void cargar();
  }, []);

  const categoriasPrincipales = categorias.filter((c) => !c.id_categoria_padre);
  const obtenerHijas = (idPadre: number) =>
    categorias.filter((c) => Number(c.id_categoria_padre) === idPadre);

  const productos = useMemo(() => medicamentos.map(normalizarMedicamento), [medicamentos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((med) => {
      const coincideBusqueda =
        !q ||
        med.nombreComercial.toLowerCase().includes(q) ||
        med.nombreGenerico.toLowerCase().includes(q);
      const coincideCategoria =
        categoriaSeleccionada === "todas" ||
        (categoriaSeleccionada === "ofertas"
          ? Boolean(ofertasMap[med.idMedicamento])
          : (() => {
              const catId = Number(categoriaSeleccionada);
              const hijas = categorias
                .filter((c) => Number(c.id_categoria_padre) === catId)
                .map((c) => c.id_categoria);
              return med.idCategoria === catId || hijas.includes(med.idCategoria);
            })());
      return coincideBusqueda && coincideCategoria;
    });
  }, [productos, busqueda, categoriaSeleccionada, ofertasMap, categorias]);

  const toCartItem = (med: MedicamentoNormalizado): Omit<CartItem, "cantidad"> => {
    const oferta = ofertasMap[med.idMedicamento];
    const precioOriginal = oferta ? oferta.precioOriginal || med.precioVenta : med.precioVenta;
    const precioEfectivo = oferta ? oferta.precioConDescuento : med.precioVenta;
    return {
      idMedicamento: med.idMedicamento,
      nombreComercial: med.nombreComercial,
      nombreGenerico: med.nombreGenerico,
      precioVenta: Number(precioEfectivo),
      stock: med.stock,
      requiereReceta: med.requiereReceta,
      imagen: med.imagen || undefined,
      precioOriginal: Number(precioOriginal),
      porcentajeDescuento: oferta ? Number(oferta.porcentajeDescuento) : undefined,
      nombreOferta: oferta?.nombreOferta,
      presentacion: med.presentacion || undefined,
    };
  };

  const handleVerProducto = (med: MedicamentoNormalizado) => {
    const oferta = ofertasMap[med.idMedicamento];
    const precioOriginal = oferta ? oferta.precioOriginal || med.precioVenta : med.precioVenta;
    const precioEfectivo = oferta ? oferta.precioConDescuento : med.precioVenta;
    setProductoSeleccionado({
      ...med,
      precioVenta: precioEfectivo,
      precioOriginal,
      porcentajeDescuento: oferta?.porcentajeDescuento,
      nombreOferta: oferta?.nombreOferta,
    });
    setModalAbierto(true);
  };

  const handleAgregar = (med: MedicamentoNormalizado, cantidad = 1) => {
    addItem(toCartItem(med), cantidad);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-xl text-gray-600">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  const ofertasCount = Object.keys(ofertasMap).length;

  return (
    <div className="w-full max-w-full">
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="¿Qué estás buscando?"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 pl-12"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Categorías</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => { setCategoriaSeleccionada("todas"); setCategoriaExpandida(null); }}
            className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              categoriaSeleccionada === "todas" ? "bg-blue-600 text-white shadow-lg scale-105" : "bg-white text-gray-700 hover:bg-blue-50 border-2 border-gray-200"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => { setCategoriaSeleccionada("ofertas"); setCategoriaExpandida(null); }}
            className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              categoriaSeleccionada === "ofertas" ? "bg-red-500 text-white shadow-lg scale-105" : "bg-white text-red-600 hover:bg-red-50 border-2 border-red-200"
            }`}
          >
            Ofertas ({ofertasCount})
          </button>
          {categoriasPrincipales.map((cat) => {
            const hijas = obtenerHijas(cat.id_categoria);
            const tieneHijas = hijas.length > 0;
            const estaExpandida = categoriaExpandida === cat.id_categoria;
            const estaSeleccionada = categoriaSeleccionada === String(cat.id_categoria);
            return (
              <div key={cat.id_categoria} className="flex flex-col">
                <button
                  onClick={() => {
                    if (tieneHijas) setCategoriaExpandida(estaExpandida ? null : cat.id_categoria);
                    setCategoriaSeleccionada(String(cat.id_categoria));
                  }}
                  className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
                    estaSeleccionada ? "bg-blue-600 text-white shadow-lg scale-105" : "bg-white text-gray-700 hover:bg-blue-50 border-2 border-gray-200"
                  }`}
                >
                  {cat.nombre}
                  {tieneHijas && <span className="text-xs opacity-70">{estaExpandida ? "▲" : "▼"}</span>}
                </button>
                {tieneHijas && estaExpandida && (
                  <div className="flex flex-wrap gap-2 mt-2 ml-4 pl-4 border-l-2 border-blue-300">
                    {hijas.map((hija) => (
                      <button
                        key={hija.id_categoria}
                        onClick={() => setCategoriaSeleccionada(String(hija.id_categoria))}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                          categoriaSeleccionada === String(hija.id_categoria)
                            ? "bg-blue-500 text-white shadow-md"
                            : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                        }`}
                      >
                        {hija.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {categoriaSeleccionada === "ofertas" ? `Medicamentos en oferta (${filtrados.length})` : `Medicamentos (${filtrados.length})`}
          </h2>
        </div>
        {filtrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
            <p className="text-xl text-gray-600 font-medium">No se encontraron medicamentos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtrados.map((med) => {
              const oferta = ofertasMap[med.idMedicamento];
              const precioOriginal = oferta ? oferta.precioOriginal || med.precioVenta : med.precioVenta;
              const precioEfectivo = oferta ? oferta.precioConDescuento : med.precioVenta;
              return (
                <ProductCard
                  key={med.idMedicamento}
                  nombre={med.nombreComercial}
                  generico={med.nombreGenerico}
                  presentacion={med.presentacion}
                  imagen={med.imagen}
                  precio={precioEfectivo}
                  precioOriginal={precioOriginal}
                  porcentajeDescuento={oferta?.porcentajeDescuento}
                  stock={med.stock}
                  requiereReceta={med.requiereReceta}
                  badgeOferta={oferta ? "OFERTA" : undefined}
                  onClick={() => handleVerProducto(med)}
                  onAdd={() => handleAgregar(med, 1)}
                  addLabel="Agregar"
                />
              );
            })}
          </div>
        )}
      </div>

      <ProductModal
        producto={productoSeleccionado}
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onAdd={(prod, cantidad) => {
          const med = productos.find((m) => m.idMedicamento === Number(prod.idMedicamento ?? prod.id_medicamento ?? prod.id));
          if (med) handleAgregar(med, cantidad);
        }}
      />
    </div>
  );
}

export default DashboardCliente;
