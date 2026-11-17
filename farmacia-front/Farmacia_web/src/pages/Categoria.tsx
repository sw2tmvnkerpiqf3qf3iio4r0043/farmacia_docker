import { useEffect, useState } from 'react';
import PanelContenido from "../components/PanelContenido";
import CategoriaModal from "../components/CategoriaModal";
import apiClient from "../api/apiClient";

interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion: string;
  tipo_categoria: string;
  tipo_enfermedad: string;
  id_categoria_padre: number | null;
  nombre_categoria_padre?: string;
  fecha_creacion: string;
}

interface Medicamento {
  idMedicamento: number;
  idCategoria: number;
}

function Categoria() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo_categoria: 'medicamento',
    tipo_enfermedad: 'general',
    id_categoria_padre: '',
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserRole(user.role || 'user');
    }
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      const [catsRes, medsRes] = await Promise.all([
        apiClient.get('/categoria'),
        apiClient.get('/medicamento')
      ]);
      
      const medicamentos: Medicamento[] = medsRes.data;
      const categoriasConMedicamentos = catsRes.data.filter((cat: Categoria) => 
        medicamentos.some((med: Medicamento) => med.idCategoria === cat.id_categoria)
      );
      
      setCategorias(categoriasConMedicamentos);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'id_categoria_padre' ? (value === '' ? null : parseInt(value)) : value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (categoriaEditando) {
        await apiClient.put(`/categoria/${categoriaEditando.id_categoria}`, formData);
        alert("✅ Categoría actualizada correctamente");
      } else {
        await apiClient.post('/categoria', formData);
        alert("✅ Categoría creada correctamente");
      }
      setModalAbierto(false);
      setCategoriaEditando(null);
      setFormData({ nombre: '', descripcion: '', tipo_categoria: 'medicamento', tipo_enfermedad: 'general', id_categoria_padre: '' });
      cargarCategorias();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al guardar la categoría');
    }
  };

  const handleEditar = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setFormData({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || '',
      tipo_categoria: categoria.tipo_categoria,
      tipo_enfermedad: categoria.tipo_enfermedad,
      id_categoria_padre: categoria.id_categoria_padre ? categoria.id_categoria_padre.toString() : '',
    });
    setModalAbierto(true);
  };

  const handleEliminar = async (id: number) => {
    if (confirm('¿Está seguro de eliminar esta categoría?')) {
      try {
        await apiClient.delete(`/categoria/${id}`);
        alert("✅ Categoría eliminada correctamente");
        cargarCategorias();
      } catch (error: any) {
        alert(error.response?.data?.message || 'Error al eliminar la categoría');
      }
    }
  };

  const handleAbrirModalAgregar = () => {
    setCategoriaEditando(null);
    setFormData({ nombre: '', descripcion: '', tipo_categoria: 'medicamento', tipo_enfermedad: 'general', id_categoria_padre: '' });
    setModalAbierto(true);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📂 Gestión de Categorías</h1>
          <p className="text-gray-600 mt-1">Categorías con productos asociados</p>
        </div>
        {userRole === 'admin' && (
          <button 
            onClick={handleAbrirModalAgregar} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            Nueva Categoría
          </button>
        )}
      </div>

      {/* Tabla de Categorías */}
      <PanelContenido titulo={`📋 Categorías Activas (${categorias.length})`} colSpan={3}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Enfermedad</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Fecha Creación</th>
                {userRole === 'admin' && (
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categorias.map((categoria) => (
                <tr key={categoria.id_categoria} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-3 text-sm text-gray-600">{categoria.id_categoria}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{categoria.nombre}</p>
                    {categoria.descripcion && <p className="text-xs text-gray-500">{categoria.descripcion}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold capitalize">
                      {categoria.tipo_categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{categoria.tipo_enfermedad}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(categoria.fecha_creacion).toLocaleDateString()}</td>
                  {userRole === 'admin' && (
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEditar(categoria)} 
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition"
                        >
                          ✏️ Editar
                        </button>
                        <button 
                          onClick={() => handleEliminar(categoria.id_categoria)} 
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {categorias.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">No hay categorías con productos asociados</p>
            </div>
          )}
        </div>
      </PanelContenido>

      {/* Modal para Agregar/Editar */}
      <CategoriaModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={handleSubmit}
        formData={formData}
        categorias={categorias}
        editandoId={categoriaEditando?.id_categoria || null}
        onInputChange={handleInputChange}
      />
    </div>
  );
}

export default Categoria;