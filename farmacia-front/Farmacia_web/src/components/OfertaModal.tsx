import { useEffect, useMemo, useRef, useState } from "react";
import OfertaForm, { type OfertaFormData } from "./OfertaForm";
import apiClient from "../api/apiClient";

interface RawItem {
  [key: string]: unknown;
  idMedicamento?: number | string;
  id_medicamento?: number | string;
  id?: number | string;
  nombreComercial?: string;
  nombre_comercial?: string;
  nombreGenerico?: string;
  nombre_generico?: string;
  codigoBarras?: string;
  codigo_barras?: string;
  precioVenta?: number | string;
  precio_venta?: number | string;
  precioOriginal?: number | string;
  precio_original?: number | string;
  precioConDescuento?: number | string;
  precio_con_descuento?: number | string;
  porcentajeDescuento?: number | string;
  porcentaje_descuento?: number | string;
  stock?: number | string;
  idCategoria?: number | string;
  id_categoria?: number | string;
  id_categoria_padre?: number | string;
}

interface MedicamentoDisponible {
  id: number;
  nombre: string;
  generico: string;
  codigo: string;
  precio: number;
  stock: number;
  idCategoria: number | null;
}

interface MedicamentoAsignado {
  id: number;
  nombre: string;
  precioOriginal: number;
  porcentaje: number;
  precioConDescuento: number;
}

interface OfertaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (idsMedicamentos: number[]) => void | Promise<void>;
  formData: OfertaFormData;
  editandoId: number | null;
  guardando: boolean;
  errores: string[];
  onInputChange: (field: keyof OfertaFormData, value: string | boolean) => void;
}

const INPUT_CLASS =
  "px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none";

function extraerArreglo(data: unknown): RawItem[] {
  if (Array.isArray(data)) return data as RawItem[];
  if (data && typeof data === "object") {
    const objeto = data as { medicamentos?: unknown; data?: unknown };
    if (Array.isArray(objeto.medicamentos)) return objeto.medicamentos as RawItem[];
    if (Array.isArray(objeto.data)) return objeto.data as RawItem[];
  }
  return [];
}

function numero(valor: unknown, fallback = 0): number {
  if (valor === undefined || valor === null || valor === "") return fallback;
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : fallback;
}

function texto(valor: unknown, fallback = ""): string {
  return valor === undefined || valor === null || valor === "" ? fallback : String(valor);
}

function normalizarMedicamento(raw: RawItem): MedicamentoDisponible {
  const id = numero(raw.idMedicamento ?? raw.id_medicamento ?? raw.id);
  return {
    id,
    nombre: texto(raw.nombreComercial ?? raw.nombre_comercial, `Producto ${id}`),
    generico: texto(raw.nombreGenerico ?? raw.nombre_generico),
    codigo: texto(raw.codigoBarras ?? raw.codigo_barras),
    precio: numero(raw.precioVenta ?? raw.precio_venta),
    stock: numero(raw.stock),
    idCategoria:
      raw.idCategoria !== undefined && raw.idCategoria !== null
        ? numero(raw.idCategoria)
        : raw.id_categoria !== undefined && raw.id_categoria !== null
          ? numero(raw.id_categoria)
          : null,
  };
}

function normalizarAsignados(
  rawAsignados: unknown,
  rawConOferta: unknown,
  medicamentos: MedicamentoDisponible[],
  porcentajeFallback: number
): MedicamentoAsignado[] {
  const conOferta = new Map<number, RawItem>();
  extraerArreglo(rawConOferta).forEach((item) => {
    const id = numero(item.idMedicamento ?? item.id_medicamento ?? item.id);
    if (id > 0) conOferta.set(id, item);
  });

  return extraerArreglo(rawAsignados)
    .map((raw) => {
      const id = numero(raw.idMedicamento ?? raw.id_medicamento ?? raw.id);
      const info = conOferta.get(id);
      const med = medicamentos.find((item) => item.id === id);
      const nombre = texto(
        raw.nombreComercial ??
          raw.nombre_comercial ??
          info?.nombreComercial ??
          info?.nombre_comercial ??
          med?.nombre,
        `Producto ${id}`
      );
      const precioOriginal = numero(
        raw.precioOriginal ??
          raw.precio_original ??
          info?.precioOriginal ??
          info?.precio_original ??
          raw.precioVenta ??
          raw.precio_venta ??
          med?.precio
      );
      const porcentaje = numero(
        raw.porcentajeDescuento ??
          raw.porcentaje_descuento ??
          info?.porcentajeDescuento ??
          info?.porcentaje_descuento,
        porcentajeFallback
      );
      const conDescuento = numero(
        raw.precioConDescuento ??
          raw.precio_con_descuento ??
          info?.precioConDescuento ??
          info?.precio_con_descuento,
        Number.NaN
      );
      return {
        id,
        nombre,
        precioOriginal,
        porcentaje,
        precioConDescuento: Number.isFinite(conDescuento)
          ? conDescuento
          : precioOriginal * (1 - porcentaje / 100),
      };
    })
    .filter((item) => item.id > 0);
}

const OfertaModal = ({
  isOpen,
  onClose,
  onSave,
  formData,
  editandoId,
  guardando,
  errores,
  onInputChange,
}: OfertaModalProps) => {
  const [medicamentos, setMedicamentos] = useState<MedicamentoDisponible[]>([]);
  const [categorias, setCategorias] = useState<Array<{ id_categoria: number; nombre: string }>>([]);
  const [idsSeleccionados, setIdsSeleccionados] = useState<number[]>([]);
  const [medicamentosAsignados, setMedicamentosAsignados] = useState<MedicamentoAsignado[]>([]);
  const [busquedaMed, setBusquedaMed] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [cargando, setCargando] = useState(false);
  const porcentajeRef = useRef(formData.porcentajeDescuento);

  useEffect(() => {
    porcentajeRef.current = formData.porcentajeDescuento;
  }, [formData.porcentajeDescuento]);

  useEffect(() => {
    if (!isOpen) {
      setIdsSeleccionados([]);
      setMedicamentosAsignados([]);
      return;
    }

    let activo = true;
    const cargarDatos = async () => {
      try {
        setCargando(true);
        const [resMed, resCat] = await Promise.all([
          apiClient.get("/medicamento"),
          apiClient.get("/categoria").catch(() => ({ data: [] })),
        ]);
        if (!activo) return;
        const listaMedicamentos = extraerArreglo(resMed.data).map(normalizarMedicamento);
        setMedicamentos(listaMedicamentos);
        setCategorias(
          extraerArreglo(resCat.data).map((cat) => ({
            id_categoria: numero(cat.id_categoria),
            nombre: texto(cat.nombre),
          }))
        );

        if (editandoId) {
          const [resAsignados, resConOferta] = await Promise.all([
            apiClient.get(`/oferta/${editandoId}/medicamentos`).catch(() => ({ data: [] })),
            apiClient.get("/medicamento/con-oferta").catch(() => ({ data: [] })),
          ]);
          if (!activo) return;
          const asignados = normalizarAsignados(
            resAsignados.data,
            resConOferta.data,
            listaMedicamentos,
            numero(porcentajeRef.current)
          );
          setMedicamentosAsignados(asignados);
          setIdsSeleccionados(asignados.map((item) => item.id));
        } else {
          setMedicamentosAsignados([]);
          setIdsSeleccionados([]);
        }
      } finally {
        if (activo) setCargando(false);
      }
    };
    void cargarDatos();
    return () => {
      activo = false;
    };
  }, [isOpen, editandoId]);

  const medicamentosFiltrados = useMemo(() => {
    const busqueda = busquedaMed.trim().toLowerCase();
    return medicamentos.filter((med) => {
      const coincideBusqueda =
        !busqueda ||
        med.nombre.toLowerCase().includes(busqueda) ||
        med.generico.toLowerCase().includes(busqueda) ||
        med.codigo.toLowerCase().includes(busqueda);
      const coincideCategoria =
        categoriaFiltro === "todas" || String(med.idCategoria) === categoriaFiltro;
      return coincideBusqueda && coincideCategoria;
    });
  }, [medicamentos, busquedaMed, categoriaFiltro]);

  const todosSeleccionados =
    medicamentosFiltrados.length > 0 &&
    medicamentosFiltrados.every((med) => idsSeleccionados.includes(med.id));

  const toggleSeleccion = (id: number) => {
    setIdsSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    const visibles = medicamentosFiltrados.map((med) => med.id);
    setIdsSeleccionados((prev) =>
      todosSeleccionados
        ? prev.filter((id) => !visibles.includes(id))
        : Array.from(new Set([...prev, ...visibles]))
    );
  };

  const nombreCategoria = (id: number | null) =>
    categorias.find((cat) => cat.id_categoria === id)?.nombre ?? "Sin categoría";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
          <h2 className="text-xl font-bold">{editandoId ? "Editar oferta" : "Nueva oferta"}</h2>
          <button onClick={onClose} className="text-white text-2xl hover:text-gray-200" title="Cerrar">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {errores.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              <ul className="list-disc list-inside">
                {errores.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <OfertaForm formData={formData} onInputChange={onInputChange} />

          {editandoId && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                Productos asignados ({medicamentosAsignados.length})
              </h3>
              {cargando ? (
                <p className="text-center py-4 text-gray-500">Cargando productos asignados...</p>
              ) : medicamentosAsignados.length === 0 ? (
                <div className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-lg p-4 text-center">
                  <p className="text-yellow-700 text-sm">Esta oferta aún no tiene productos asignados.</p>
                </div>
              ) : (
                <div className="border-2 border-green-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-green-50 text-green-800">
                      <tr>
                        <th className="px-3 py-2 text-left">Producto</th>
                        <th className="px-3 py-2 text-right">Precio original</th>
                        <th className="px-3 py-2 text-right">Descuento</th>
                        <th className="px-3 py-2 text-right">Precio con descuento</th>
                        <th className="px-3 py-2 text-center">Asignado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-green-100">
                      {medicamentosAsignados.map((med) => (
                        <tr key={med.id}>
                          <td className="px-3 py-2 font-medium text-gray-800">{med.nombre}</td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            Bs. {med.precioOriginal.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right text-red-600 font-semibold">
                            {med.porcentaje.toFixed(2)}%
                          </td>
                          <td className="px-3 py-2 text-right text-green-700 font-bold">
                            Bs. {med.precioConDescuento.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={idsSeleccionados.includes(med.id)}
                              onChange={() => toggleSeleccion(med.id)}
                              className="w-4 h-4"
                              aria-label={`Asignar ${med.nombre}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Productos disponibles ({idsSeleccionados.length} seleccionados)
              </h3>
              {idsSeleccionados.length > 0 && (
                <button
                  onClick={() => setIdsSeleccionados([])}
                  className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                >
                  Limpiar selección
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busquedaMed}
                onChange={(e) => setBusquedaMed(e.target.value)}
                className={INPUT_CLASS}
              />
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className={`${INPUT_CLASS} bg-white`}
              >
                <option value="todas">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            {medicamentosFiltrados.length > 0 && (
              <div className="flex items-center justify-between mb-2 px-2 text-xs text-gray-600">
                <span>
                  Mostrando {medicamentosFiltrados.length} de {medicamentos.length}
                </span>
                <button
                  type="button"
                  onClick={toggleTodos}
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium"
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      todosSeleccionados ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                    }`}
                  >
                    {todosSeleccionados && <span className="text-white text-xs">✓</span>}
                  </div>
                  {todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>
            )}

            {cargando ? (
              <p className="text-center py-8 text-gray-500">Cargando...</p>
            ) : medicamentosFiltrados.length === 0 ? (
              <p className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No hay productos disponibles.
              </p>
            ) : (
              <div className="border-2 border-gray-200 rounded-lg max-h-64 overflow-y-auto bg-white">
                {medicamentosFiltrados.map((med) => (
                  <div
                    key={med.id}
                    className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${
                      idsSeleccionados.includes(med.id) ? "bg-green-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={idsSeleccionados.includes(med.id)}
                      onChange={() => toggleSeleccion(med.id)}
                      className="w-5 h-5 cursor-pointer"
                      aria-label={`Seleccionar ${med.nombre}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{med.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {nombreCategoria(med.idCategoria)} · Stock: {med.stock}
                      </p>
                    </div>
                    <p className="font-bold text-sm text-gray-800">Bs. {med.precio.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={() => void onSave(idsSeleccionados)}
            disabled={guardando}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition"
          >
            {guardando
              ? "Guardando..."
              : `${editandoId ? "Actualizar" : "Guardar oferta"} (${idsSeleccionados.length})`}
          </button>
          <button
            onClick={onClose}
            className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg font-semibold transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfertaModal;
