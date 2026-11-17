import React, { useState, useEffect, useMemo } from "react";
import OfertaForm from "./OfertaForm";
import apiClient from "../api/apiClient";

interface OfertaFormData {
  nombre_oferta: string;
  descripcion: string;
  porcentaje_descuento: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: string;
}

interface Medicamento {
  id_medicamento?: number;
  idMedicamento?: number;
  nombre_comercial?: string;
  nombreComercial?: string;
  nombre_generico?: string;
  nombreGenerico?: string;
  precio_venta?: number | string;
  precioVenta?: number | string;
  stock?: number | string;
  id_categoria?: number;
  idCategoria?: number;
  codigo_barras?: string;
  codigoBarras?: string;
  precioConDescuento?: number | string;
  precioOriginal?: number | string;
}

interface Categoria {
  id_categoria: number;
  nombre: string;
}

interface OfertaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medicamentosSeleccionados: number[]) => void | Promise<void>;
  formData: OfertaFormData;
  editandoId: number | null;
  onInputChange: (field: string, value: any) => void;
}

const OfertaModal: React.FC<OfertaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  formData,
  editandoId,
  onInputChange,
}) => {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [idsSeleccionados, setIdsSeleccionados] = useState<number[]>([]);
  const [busquedaMed, setBusquedaMed] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [cargando, setCargando] = useState(false);
  const [medicamentosAsignados, setMedicamentosAsignados] = useState<any[]>([]);
  const [cargandoAsignados, setCargandoAsignados] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIdsSeleccionados([]);
      setBusquedaMed("");
      setCategoriaFiltro("todas");
      setMedicamentosAsignados([]);
      cargarDatos();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && editandoId && medicamentos.length > 0) {
      cargarAsignados(editandoId);
    }
  }, [isOpen, editandoId, medicamentos.length]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [resMed, resCat] = await Promise.all([
        apiClient.get("/medicamento"),
        apiClient.get("/categoria").catch(() => ({ data: [] })),
      ]);
      setMedicamentos(resMed.data || []);
      setCategorias(resCat.data || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setCargando(false);
    }
  };

  const cargarAsignados = async (idOferta: number) => {
    try {
      setCargandoAsignados(true);
      const res = await apiClient.get(`/oferta/${idOferta}/medicamentos`);
      const asignados = res.data || [];
      setMedicamentosAsignados(asignados);
      const ids = asignados
        .map((a: any) => a.idMedicamento || a.id_medicamento)
        .filter((id: number) => id);
      setIdsSeleccionados(ids);
    } catch (error) {
      console.error("Error cargando asignados:", error);
      setMedicamentosAsignados([]);
      setIdsSeleccionados([]);
    } finally {
      setCargandoAsignados(false);
    }
  };

  const getIdMedicamento = (m: Medicamento): number => {
    return m.id_medicamento || m.idMedicamento || 0;
  };

  const toggleSeleccion = (id: number) => {
    setIdsSeleccionados(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  const limpiarTodo = () => {
    setIdsSeleccionados([]);
  };

  const getNombre = (m: Medicamento) => m.nombre_comercial || m.nombreComercial || `Med ${getIdMedicamento(m)}`;
  const getPrecio = (m: Medicamento) => parseFloat(String(m.precio_venta || m.precioVenta || 0)) || 0;
  const getStock = (m: Medicamento) => parseInt(String(m.stock || 0)) || 0;
  const getCategoria = (m: Medicamento) => {
    const cat = categorias.find(c => c.id_categoria === (m.id_categoria || m.idCategoria));
    return cat?.nombre || "Sin categoría";
  };

  const medicamentosFiltrados = useMemo(() => {
    return medicamentos.filter(m => {
      const busqueda = busquedaMed.toLowerCase();
      const nombre = getNombre(m).toLowerCase();
      const generico = (m.nombre_generico || m.nombreGenerico || "").toLowerCase();
      const codigo = (m.codigo_barras || m.codigoBarras || "").toLowerCase();
      const idCat = m.id_categoria || m.idCategoria;
      const coincideBusqueda = !busqueda || nombre.includes(busqueda) || generico.includes(busqueda) || codigo.includes(busqueda);
      const coincideCategoria = categoriaFiltro === "todas" || String(idCat) === categoriaFiltro;
      return coincideBusqueda && coincideCategoria;
    });
  }, [medicamentos, busquedaMed, categoriaFiltro]);

  const todosSeleccionados = medicamentosFiltrados.length > 0 && medicamentosFiltrados.every(m => idsSeleccionados.includes(getIdMedicamento(m)));

  const toggleTodos = () => {
    const idsVisibles = medicamentosFiltrados.map(m => getIdMedicamento(m));
    if (todosSeleccionados) {
      setIdsSeleccionados(prev => prev.filter(id => !idsVisibles.includes(id)));
    } else {
      setIdsSeleccionados(prev => {
        const combinados = new Set([...prev, ...idsVisibles]);
        return Array.from(combinados);
      });
    }
  };

  const handleGuardar = async () => {
    try {
      await onSave(idsSeleccionados);
      if (editandoId) {
        await cargarAsignados(editandoId);
      }
    } catch (error: any) {
      console.error('Error al guardar:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
          <h2 className="text-xl font-bold">{editandoId ? "Editar Oferta" : "Nueva Oferta"}</h2>
          <button onClick={onClose} className="text-white text-2xl hover:text-gray-200">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <OfertaForm formData={formData} onInputChange={onInputChange} />

          {editandoId && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                Medicamentos en esta oferta ({medicamentosAsignados.length})
              </h3>
              {cargandoAsignados ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent"></div>
                </div>
              ) : medicamentosAsignados.length === 0 ? (
                <div className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-lg p-4 text-center">
                  <p className="text-yellow-700 text-sm">Esta oferta no tiene medicamentos asignados</p>
                </div>
              ) : (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {medicamentosAsignados.map((med: any) => {
                      const idMed = med.idMedicamento || med.id_medicamento;
                      const seleccionado = idsSeleccionados.includes(idMed);
                      return (
                        <div key={idMed} className={`flex items-center gap-2 p-2 rounded border ${seleccionado ? "bg-white border-green-400" : "bg-gray-100 opacity-60"}`}>
                          <input type="checkbox" checked={seleccionado} onChange={() => toggleSeleccion(idMed)} className="w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{med.nombreComercial || med.nombre_comercial}</p>
                            <p className="text-xs text-green-600 font-bold">Bs. {Number(med.precioConDescuento || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Medicamentos disponibles ({idsSeleccionados.length} seleccionados)
              </h3>
              {idsSeleccionados.length > 0 && (
                <button onClick={limpiarTodo} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200">Limpiar</button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <input type="text" placeholder="Buscar por nombre..." value={busquedaMed} onChange={(e) => setBusquedaMed(e.target.value)} className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
              <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:outline-none">
                <option value="todas">Todas las categorías</option>
                {categorias.map(cat => <option key={cat.id_categoria} value={String(cat.id_categoria)}>{cat.nombre}</option>)}
              </select>
            </div>

            {medicamentosFiltrados.length > 0 && (
              <div className="flex items-center justify-between mb-2 px-2 text-xs text-gray-600">
                <span>Mostrando {medicamentosFiltrados.length} de {medicamentos.length}</span>
                <button type="button" onClick={toggleTodos} className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${todosSeleccionados ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}>
                    {todosSeleccionados && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span>{todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}</span>
                </button>
              </div>
            )}

            {cargando ? (
              <p className="text-center py-8 text-gray-500">Cargando...</p>
            ) : medicamentosFiltrados.length === 0 ? (
              <p className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">No hay medicamentos</p>
            ) : (
              <div className="border-2 border-gray-200 rounded-lg max-h-64 overflow-y-auto bg-white">
                {medicamentosFiltrados.map(med => {
                  const idMed = getIdMedicamento(med);
                  const seleccionado = idsSeleccionados.includes(idMed);
                  return (
                    <div key={idMed} className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${seleccionado ? "bg-green-50" : "bg-white hover:bg-gray-50"}`}>
                      <input type="checkbox" checked={seleccionado} onChange={() => toggleSeleccion(idMed)} className="w-5 h-5 text-green-600 rounded cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{getNombre(med)}</p>
                        <p className="text-xs text-gray-500">{getCategoria(med)} - Stock: {getStock(med)}</p>
                      </div>
                      <p className="font-bold text-sm text-gray-800">Bs. {getPrecio(med).toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={handleGuardar} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition">
            {editandoId ? "Actualizar" : "Guardar Oferta"} ({idsSeleccionados.length})
          </button>
          <button onClick={onClose} className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg font-semibold transition">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default OfertaModal;