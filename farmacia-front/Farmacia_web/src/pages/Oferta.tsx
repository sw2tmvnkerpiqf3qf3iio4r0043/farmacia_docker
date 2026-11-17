import { useEffect, useState } from 'react';
import PanelContenido from "../components/PanelContenido";
import OfertaModal from "../components/OfertaModal";
import apiClient from "../api/apiClient";

interface Oferta {
  id_oferta: number;
  nombre_oferta: string;
  descripcion: string;
  porcentaje_descuento: number | string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: number | boolean | string;
  created_at?: string;
}

function Oferta() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [ofertasFiltradas, setOfertasFiltradas] = useState<Oferta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ofertaEditando, setOfertaEditando] = useState<Oferta | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [busqueda, setBusqueda] = useState('');

  const [formData, setFormData] = useState({
    nombre_oferta: '',
    descripcion: '',
    porcentaje_descuento: '0',
    fecha_inicio: '',
    fecha_fin: '',
    activo: '1',
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserRole(user.role || 'user');
    }
    cargarOfertas();
  }, []);

  useEffect(() => {
    if (busqueda.trim() === '') {
      setOfertasFiltradas(ofertas);
    } else {
      const filtradas = ofertas.filter((oferta) =>
        (oferta.nombre_oferta || '').toLowerCase().includes(busqueda.toLowerCase())
      );
      setOfertasFiltradas(filtradas);
    }
  }, [busqueda, ofertas]);

  const cargarOfertas = async () => {
    try {
      setCargando(true);
      const response = await apiClient.get('/oferta');
      const ofertasOrdenadas = response.data.sort((a: Oferta, b: Oferta) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setOfertas(ofertasOrdenadas);
      setOfertasFiltradas(ofertasOrdenadas);
    } catch (error) {
      console.error('Error al cargar ofertas:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const convertirFechaAISO = (fecha: string): string => {
    if (!fecha) return new Date().toISOString();
    if (fecha.includes('T')) return fecha;
    if (fecha.includes('/')) {
      const [dia, mes, anio] = fecha.split('/');
      return `${anio}-${mes}-${dia}T00:00:00.000Z`;
    }
    return `${fecha}T00:00:00.000Z`;
  };

  const handleSubmit = async (medicamentosSeleccionados: number[]) => {
    if (!formData.nombre_oferta.trim()) {
      alert('❌ El nombre es requerido');
      return;
    }
    if (!formData.fecha_inicio || !formData.fecha_fin) {
      alert('❌ Las fechas son requeridas');
      return;
    }
    const porcentaje = parseFloat(formData.porcentaje_descuento);
    if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      alert('❌ El porcentaje debe estar entre 0 y 100');
      return;
    }

    const datos = {
      nombreOferta: formData.nombre_oferta.trim(),
      descripcion: formData.descripcion.trim(),
      porcentajeDescuento: porcentaje,
      fechaInicio: convertirFechaAISO(formData.fecha_inicio),
      fechaFin: convertirFechaAISO(formData.fecha_fin),
      activo: formData.activo === '1' ? 1 : 0,
    };

    try {
      let ofertaId: number;

      if (ofertaEditando) {
        await apiClient.put(`/oferta/${ofertaEditando.id_oferta}`, datos);
        ofertaId = ofertaEditando.id_oferta;

        const resActuales = await apiClient.get(`/oferta/${ofertaId}/medicamentos`);
        const idsActuales: number[] = (resActuales.data || []).map((m: any) => m.idMedicamento || m.id_medicamento);

        const idsNuevos = medicamentosSeleccionados.filter((id: number) => !idsActuales.includes(id));
        const idsQuitar = idsActuales.filter((id: number) => !medicamentosSeleccionados.includes(id));

        for (const idMed of idsNuevos) {
          await apiClient.post(`/oferta/${ofertaId}/medicamentos`, { idMedicamento: Number(idMed) });
        }
        for (const idMed of idsQuitar) {
          await apiClient.delete(`/oferta/${ofertaId}/medicamentos/${idMed}`);
        }
      } else {
        const res = await apiClient.post('/oferta', datos);
        ofertaId = res.data.id_oferta || res.data.idOferta;
        for (const idMed of medicamentosSeleccionados) {
          await apiClient.post(`/oferta/${ofertaId}/medicamentos`, { idMedicamento: Number(idMed) });
        }
      }

      await cargarOfertas();
      setModalAbierto(false);
      setOfertaEditando(null);
      setFormData({ nombre_oferta: '', descripcion: '', porcentaje_descuento: '0', fecha_inicio: '', fecha_fin: '', activo: '1' });
      alert('✅ Oferta guardada correctamente');
    } catch (error: any) {
      const errorData = error.response?.data;
      let mensaje = 'Error desconocido';
      if (errorData?.details && Array.isArray(errorData.details)) {
        mensaje = 'Campos inválidos:\n' + errorData.details.map((d: any) => `• ${d.param || d.path}: ${d.msg}`).join('\n');
      } else if (errorData?.message) {
        mensaje = errorData.message;
      } else if (error.message) {
        mensaje = error.message;
      }
      alert(`❌ ${mensaje}`);
    }
  };

  const handleEditar = (oferta: Oferta) => {
    const fechaInicio = (oferta.fecha_inicio || '').includes('T') ? (oferta.fecha_inicio || '').split('T')[0] : (oferta.fecha_inicio || '');
    const fechaFin = (oferta.fecha_fin || '').includes('T') ? (oferta.fecha_fin || '').split('T')[0] : (oferta.fecha_fin || '');
    setOfertaEditando(oferta);
    setFormData({
      nombre_oferta: oferta.nombre_oferta,
      descripcion: oferta.descripcion || '',
      porcentaje_descuento: String(oferta.porcentaje_descuento),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      activo: String(oferta.activo === 1 || oferta.activo === true ? '1' : '0'),
    });
    setModalAbierto(true);
  };

  const handleEliminar = async (id: number) => {
    if (confirm('¿Está seguro de eliminar esta oferta?')) {
      try {
        await apiClient.delete(`/oferta/${id}`);
        await cargarOfertas();
      } catch (error: any) {
        alert(error.response?.data?.message || 'Error al eliminar');
      }
    }
  };

  const handleAbrirModalAgregar = () => {
    setOfertaEditando(null);
    setFormData({ nombre_oferta: '', descripcion: '', porcentaje_descuento: '0', fecha_inicio: '', fecha_fin: '', activo: '1' });
    setModalAbierto(true);
  };

  const obtenerEstadoOferta = (oferta: Oferta) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaInicio = new Date(oferta.fecha_inicio || Date.now());
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(oferta.fecha_fin || Date.now());
    fechaFin.setHours(23, 59, 59, 999);
    const activaManual = oferta.activo === 1 || oferta.activo === true || oferta.activo === "1";
    if (!activaManual) return { texto: 'Inactiva', color: 'text-gray-600', bg: 'bg-gray-100', icono: '⏸️', descripcion: 'Desactivada manualmente' };
    if (hoy < fechaInicio) return { texto: 'Programada', color: 'text-blue-600', bg: 'bg-blue-100', icono: '📅', descripcion: `Inicia: ${fechaInicio.toLocaleDateString('es-ES')}` };
    if (hoy > fechaFin) return { texto: 'Vencida', color: 'text-orange-600', bg: 'bg-orange-100', icono: '⏰', descripcion: `Venció: ${fechaFin.toLocaleDateString('es-ES')}` };
    return { texto: 'Activa', color: 'text-green-600', bg: 'bg-green-100', icono: '✅', descripcion: 'Oferta vigente' };
  };

  const formatearFecha = (fecha: string): string => {
    if (!fecha) return 'Sin fecha';
    try { return new Date(fecha).toLocaleDateString('es-ES'); } catch { return 'Fecha inválida'; }
  };

  const formatearPorcentaje = (valor: number | string): string => {
    const num = typeof valor === 'string' ? parseFloat(valor) : valor;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ofertas y Promociones</h1>
          <p className="text-gray-600 mt-1">Gestión automática de ofertas</p>
        </div>
        {userRole === 'admin' && (
          <button onClick={handleAbrirModalAgregar} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2">
            <i className="fa-solid fa-plus"></i> Nueva Oferta
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <input type="text" placeholder="Buscar oferta por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition" />
        <p className="text-sm text-gray-600 mt-2">Mostrando {ofertasFiltradas.length} de {ofertas.length} ofertas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ofertasFiltradas.map((oferta) => {
          const estado = obtenerEstadoOferta(oferta);
          return (
            <PanelContenido key={oferta.id_oferta} titulo="" colSpan={1}>
              <div className="relative">
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  -{formatearPorcentaje(oferta.porcentaje_descuento)}%
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 pr-16">{oferta.nombre_oferta}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{oferta.descripcion}</p>
                <div className="text-xs text-gray-500 mb-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <i className="fa-regular fa-calendar text-blue-500"></i>
                    <span>Inicio: <strong>{formatearFecha(oferta.fecha_inicio)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fa-regular fa-calendar-check text-red-500"></i>
                    <span>Fin: <strong>{formatearFecha(oferta.fecha_fin)}</strong></span>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${estado.bg} ${estado.color} mb-4`}>
                  <span className="text-lg">{estado.icono}</span>
                  <div className="text-left">
                    <div>{estado.texto}</div>
                    <div className="text-xs opacity-75">{estado.descripcion}</div>
                  </div>
                </div>
                {userRole === 'admin' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <button onClick={() => handleEditar(oferta)} className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg text-sm font-semibold transition">Editar</button>
                    <button onClick={() => handleEliminar(oferta.id_oferta)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg text-sm font-semibold transition">Eliminar</button>
                  </div>
                )}
              </div>
            </PanelContenido>
          );
        })}
      </div>

      {ofertasFiltradas.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">{busqueda.trim() !== '' ? `No se encontraron ofertas con "${busqueda}"` : 'No hay ofertas disponibles'}</p>
        </div>
      )}

      <OfertaModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={handleSubmit}
        formData={formData}
        editandoId={ofertaEditando?.id_oferta || null}
        onInputChange={handleInputChange}
      />
    </div>
  );
}

export default Oferta;