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
  normalizarMedicamento,
  normalizarOferta,
  numero,
  texto,
  type MedicamentoNormalizado,
  type OfertaNormalizada,
  type RawMedicamento,
  type RawOferta,
} from "../api/datosTienda";

interface RawGrupoOferta {
  [key: string]: unknown;
  nombreOferta?: string;
  nombre_oferta?: string;
  nombre?: string;
  porcentajeDescuento?: number | string | null;
  porcentaje_descuento?: number | string | null;
  vencimientoOferta?: string | null;
  fechaFin?: string | null;
  fecha_fin?: string | null;
  medicamentos?: unknown;
}

interface OfertaGrupo {
  nombreOferta: string;
  porcentajeDescuento?: number;
  vencimientoOferta?: string;
  productos: MedicamentoNormalizado[];
}

function OfertasCliente() {
  const { medicamentos, cargando } = useMedicamentos();
  const { addItem } = useCart();
  const [ofertasMap, setOfertasMap] = useState<Record<number, OfertaNormalizada>>({});
  const [grupos, setGrupos] = useState<OfertaGrupo[] | null>(null);
  const [cargandoOfertas, setCargandoOfertas] = useState(true);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoModalItem | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setCargandoOfertas(true);
      try {
        const [ofertasRes, activasRes] = await Promise.all([
          apiClient.get("/medicamento/con-oferta").catch(() => ({ data: [] })),
          apiClient.get("/oferta/activas-con-productos").catch(() => ({ data: null })),
        ]);

        const ofertas = extraerArreglo<RawOferta>(ofertasRes.data);
        const map: Record<number, OfertaNormalizada> = {};
        ofertas.forEach((raw) => {
          const info = normalizarOferta(raw);
          if (!info.idMedicamento) return;
          map[info.idMedicamento] = info;
        });
        setOfertasMap(map);

        const activas = extraerArreglo<RawGrupoOferta>(activasRes.data);
        if (activas.length > 0) {
          const parsed = activas.map((of) => ({
            nombreOferta: texto(of.nombreOferta ?? of.nombre_oferta ?? of.nombre, "Oferta"),
            porcentajeDescuento: numero(of.porcentajeDescuento ?? of.porcentaje_descuento) || undefined,
            vencimientoOferta:
              texto(of.vencimientoOferta ?? of.fechaFin ?? of.fecha_fin) || undefined,
            productos: extraerArreglo<RawMedicamento>(of.medicamentos)
              .map(normalizarMedicamento)
              .filter((med) => med.idMedicamento > 0),
          })).filter((g) => g.productos.length > 0);
          if (parsed.length > 0) {
            setGrupos(parsed);
          } else {
            setGrupos(null);
          }
        } else {
          setGrupos(null);
        }
      } catch {
        setOfertasMap({});
        setGrupos(null);
      } finally {
        setCargandoOfertas(false);
      }
    };
    void cargar();
  }, []);

  const productosBase = useMemo(() => medicamentos.map(normalizarMedicamento), [medicamentos]);

  const gruposFinales: OfertaGrupo[] = useMemo(() => {
    if (grupos && grupos.length > 0) return grupos;
    const byOferta: Record<string, OfertaGrupo> = {};
    productosBase.forEach((med) => {
      const info = ofertasMap[med.idMedicamento];
      if (!info) return;
      const key = info.nombreOferta || "Oferta";
      if (!byOferta[key]) {
        byOferta[key] = {
          nombreOferta: key,
          porcentajeDescuento: info.porcentajeDescuento,
          vencimientoOferta: info.vencimientoOferta,
          productos: [],
        };
      }
      byOferta[key].productos.push(med);
    });
    return Object.values(byOferta);
  }, [grupos, productosBase, ofertasMap]);

  const toCartItem = (med: MedicamentoNormalizado): Omit<CartItem, "cantidad"> => {
    const info = ofertasMap[med.idMedicamento];
    const precioOriginal = info ? info.precioOriginal || med.precioVenta : med.precioVenta;
    const precioEfectivo = info ? info.precioConDescuento : med.precioVenta;
    return {
      idMedicamento: med.idMedicamento,
      nombreComercial: med.nombreComercial,
      nombreGenerico: med.nombreGenerico,
      precioVenta: Number(precioEfectivo),
      stock: med.stock,
      requiereReceta: med.requiereReceta,
      imagen: med.imagen || undefined,
      precioOriginal: Number(precioOriginal),
      porcentajeDescuento: info ? Number(info.porcentajeDescuento) : undefined,
      nombreOferta: info?.nombreOferta,
      presentacion: med.presentacion || undefined,
    };
  };

  const abrirModal = (med: MedicamentoNormalizado) => {
    const info = ofertasMap[med.idMedicamento];
    const precioOriginal = info ? info.precioOriginal || med.precioVenta : med.precioVenta;
    const precioEfectivo = info ? info.precioConDescuento : med.precioVenta;
    setProductoSeleccionado({
      ...med,
      precioVenta: precioEfectivo,
      precioOriginal,
      porcentajeDescuento: info?.porcentajeDescuento,
      nombreOferta: info?.nombreOferta,
    });
    setModalAbierto(true);
  };

  if (cargando || cargandoOfertas) {
    return <div className="flex items-center justify-center h-64"><p className="text-lg text-gray-600">Cargando ofertas...</p></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Ofertas activas</h2>
        <p className="text-gray-600 mt-1">Aprovecha descuentos en productos seleccionados</p>
      </div>

      {gruposFinales.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <p className="text-xl text-gray-600 font-medium">No hay ofertas activas en este momento.</p>
        </div>
      ) : (
        gruposFinales.map((grupo) => (
          <section key={grupo.nombreOferta} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-bold text-gray-900">{grupo.nombreOferta}</h3>
              {grupo.porcentajeDescuento ? (
                <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">-{grupo.porcentajeDescuento}%</span>
              ) : null}
              {grupo.vencimientoOferta ? (
                <span className="text-sm text-gray-500">Vence: {String(grupo.vencimientoOferta).slice(0, 10)}</span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {grupo.productos.map((med) => {
                const info = ofertasMap[med.idMedicamento];
                const precioOriginal = info ? info.precioOriginal || med.precioVenta : med.precioVenta;
                const precioEfectivo = info ? info.precioConDescuento : med.precioVenta;
                return (
                  <ProductCard
                    key={med.idMedicamento}
                    nombre={med.nombreComercial}
                    generico={med.nombreGenerico}
                    presentacion={med.presentacion}
                    imagen={med.imagen}
                    precio={precioEfectivo}
                    precioOriginal={precioOriginal}
                    porcentajeDescuento={info?.porcentajeDescuento}
                    stock={med.stock}
                    requiereReceta={med.requiereReceta}
                    badgeOferta="OFERTA"
                    onClick={() => abrirModal(med)}
                    onAdd={() => addItem(toCartItem(med), 1)}
                    addLabel="Agregar"
                  />
                );
              })}
            </div>
          </section>
        ))
      )}

      <ProductModal
        producto={productoSeleccionado}
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onAdd={(prod, cantidad) => {
          const med = productosBase.find((m) => m.idMedicamento === Number(prod.idMedicamento ?? prod.id_medicamento ?? prod.id));
          if (med) addItem(toCartItem(med), cantidad);
        }}
      />
    </div>
  );
}

export default OfertasCliente;
