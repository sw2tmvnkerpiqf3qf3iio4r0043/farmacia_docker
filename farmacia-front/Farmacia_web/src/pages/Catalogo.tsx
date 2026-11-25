import { useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
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

function Catalogo() {
  const { medicamentos, cargando } = useMedicamentos();
  const { addItem } = useCart();
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [categorias, setCategorias] = useState<CategoriaNormalizada[]>([]);
  const [ofertasMap, setOfertasMap] = useState<Record<number, OfertaNormalizada>>({});
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoModalItem | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

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
          : med.idCategoria === Number(categoriaSeleccionada));
      return coincideBusqueda && coincideCategoria;
    });
  }, [productos, busqueda, categoriaSeleccionada, ofertasMap]);

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

  if (cargando) {
    return <div className="flex items-center justify-center h-screen"><p className="text-xl">Cargando catálogo...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Catálogo de Medicamentos</h2>
        <p className="text-gray-600 mt-1">Explora todos nuestros productos disponibles</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre comercial o genérico..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <select
            value={categoriaSeleccionada}
            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="todas">Todas las categorías</option>
            <option value="ofertas">Solo en oferta</option>
            {categorias.map((cat) => (
              <option key={cat.id_categoria} value={String(cat.id_categoria)}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Mostrando {filtrados.length} de {productos.length} medicamentos
        </p>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <p className="text-xl text-gray-600 font-medium">No se encontraron medicamentos con esos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                onAdd={() => addItem(toCartItem(med), 1)}
                addLabel="Agregar"
              />
            );
          })}
        </div>
      )}

      <ProductModal
        producto={productoSeleccionado}
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onAdd={(prod, cantidad) => {
          const med = productos.find((m) => m.idMedicamento === Number(prod.idMedicamento ?? prod.id_medicamento ?? prod.id));
          if (med) addItem(toCartItem(med), cantidad);
        }}
      />
    </div>
  );
}

export default Catalogo;
