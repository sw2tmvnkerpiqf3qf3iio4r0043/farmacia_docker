import { useEffect, useState } from 'react';
import PanelContenido from "../components/PanelContenido";
import { useMedicamentos } from "../context/MedicamentoContext";
import apiClient from "../api/apiClient";

interface OfertaResumen {
  id_oferta: number;
  nombre_oferta: string;
  porcentaje_descuento: number | string;
  fecha_fin: string;
}

function DashboardDemo() {
  const usuario = "Administrador";
  const { medicamentos, cargando: cargandoMeds } = useMedicamentos();
  const [ofertasActivas, setOfertasActivas] = useState<OfertaResumen[]>([]);
  const [cargandoOfertas, setCargandoOfertas] = useState(true);

  const [stats, setStats] = useState({
    totalMedicamentos: 0,
    valorTotalInventario: 0,
    totalRequiereReceta: 0,
    totalStockCritico: 0,
    totalUnidadesInventario: 0
  });

  useEffect(() => {
    if (medicamentos.length > 0) {
      setStats({
        totalMedicamentos: medicamentos.length,
        valorTotalInventario: medicamentos.reduce((total, med) => total + (Number(med.precioCompra) * (med.stock || 0)), 0),
        totalRequiereReceta: medicamentos.filter(m => m.requiereReceta).length,
        totalStockCritico: medicamentos.filter(m => (m.stock || 0) <= 10).length,
        totalUnidadesInventario: medicamentos.reduce((total, med) => total + (med.stock || 0), 0)
      });
    }
  }, [medicamentos]);

  useEffect(() => {
    const cargarOfertasDashboard = async () => {
      try {
        const response = await apiClient.get('/oferta');
        const activas = response.data.filter((o: any) => o.activo === 1 || o.activo === true || o.activo === "1");
        setOfertasActivas(activas.slice(0, 3));
      } catch (error) {
        console.error('Error al cargar ofertas para dashboard:', error);
      } finally {
        setCargandoOfertas(false);
      }
    };
    cargarOfertasDashboard();
  }, []);

  // ✅ Filtrar productos con stock bajo y ordenar por urgencia
  const stockBajoList = [...medicamentos]
    .filter(m => (m.stock || 0) <= 10)
    .sort((a, b) => (a.stock || 0) - (b.stock || 0))
    .slice(0, 5);

  const actividadReciente = [
    ...(stats.totalStockCritico > 0 ? [{
      icono: "⚠️",
      titulo: "Stock crítico detectado",
      descripcion: `${stats.totalStockCritico} producto(s) requieren reposición inmediata`,
      tiempo: "Ahora",
      color: "red"
    }] : []),
    {
      icono: "💰",
      titulo: "Inventario valorizado",
      descripcion: `Valor total: Bs. ${stats.valorTotalInventario.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      tiempo: "Hoy",
      color: "blue"
    },
    {
      icono: "✅",
      titulo: "Sistema operativo",
      descripcion: "Todos los módulos funcionando correctamente",
      tiempo: "Recientemente",
      color: "green"
    }
  ];

  const targetasEstadisticas = [
    {
      title: "Valor del Inventario",
      value: `Bs. ${stats.valorTotalInventario.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      color: "green",
      cambio: "Valor total en compra",
      icono: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    {
      title: "Total Productos",
      value: stats.totalMedicamentos.toString(),
      color: "blue",
      cambio: `${stats.totalUnidadesInventario} unidades en stock`,
      icono: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
    },
    {
      title: "Requieren Receta",
      value: stats.totalRequiereReceta.toString(),
      color: "yellow",
      cambio: "Medicamentos controlados",
      icono: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
    {
      title: "Crítico de acciones",
      value: stats.totalStockCritico.toString(),
      color: "red",
      cambio: stats.totalStockCritico > 0 ? `${stats.totalStockCritico} producto(s) con stock ≤ 10` : "Todo en orden",
      icono: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    },
  ];

  if (cargandoMeds || cargandoOfertas) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-xl text-gray-600">Cargando panel de control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">¡Hola, {usuario}!</h2>
        <p className="text-gray-600 mt-1">Resumen ejecutivo del sistema de farmacia</p>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {targetasEstadisticas.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className={`text-xs mt-2 font-medium ${
                  stat.cambio === 'Todo en orden' ? 'text-green-600' : 
                  stat.cambio.includes('producto') ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stat.cambio}
                </p>
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                stat.color === 'green' ? 'bg-green-100 text-green-600' :
                stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                stat.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                {stat.icono}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: Stock Bajo */}
        <div className="lg:col-span-2">
          <PanelContenido titulo="⚠️ Productos con Stock Bajo (Reposición Urgente)" colSpan={2}>
            {stockBajoList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium">¡Excelente! No hay productos con stock crítico.</p>
                <p className="text-sm mt-1">Todos los inventarios están por encima de 10 unidades.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Producto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Precio Venta</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Prioridad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stockBajoList.map((med) => {
                      const stock = med.stock || 0;
                      // ✅ Lógica CORREGIDA de prioridad
                      const prioridad = stock <= 5 ? 'CRÍTICA' : stock <= 8 ? 'ALTA' : 'MEDIA';
                      const colorPrioridad = stock <= 5 ? 'bg-red-100 text-red-700' : stock <= 8 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700';
                      
                      return (
                        <tr key={med.idMedicamento} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{med.nombreComercial}</p>
                            <p className="text-xs text-gray-500">{med.nombreGenerico}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono">{med.codigoBarras}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                              stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-700">
                            Bs. {Number(med.precioVenta).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${colorPrioridad}`}>
                              {prioridad}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PanelContenido>
        </div>

        {/* COLUMNA DERECHA: Ofertas y Actividad */}
        <div className="space-y-6">
          
          {/* Ofertas Activas */}
          <PanelContenido titulo="️ Ofertas Activas Hoy" colSpan={1}>
            {ofertasActivas.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">No hay ofertas activas en este momento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ofertasActivas.map((oferta) => (
                  <div key={oferta.id_oferta} className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-sm text-gray-900">{oferta.nombre_oferta}</p>
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        -{typeof oferta.porcentaje_descuento === 'string' ? parseFloat(oferta.porcentaje_descuento).toFixed(0) : oferta.porcentaje_descuento}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Vence: {new Date(oferta.fecha_fin).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </PanelContenido>

          {/* Actividad del Sistema */}
          <PanelContenido titulo="🕐 Actividad del Sistema" colSpan={1}>
            <div className="space-y-3">
              {actividadReciente.map((actividad, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 transition-all hover:shadow-md ${
                  actividad.color === 'green' ? 'bg-green-50 border-green-500' :
                  actividad.color === 'red' ? 'bg-red-50 border-red-500' :
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{actividad.icono}</span>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${
                        actividad.color === 'green' ? 'text-green-900' :
                        actividad.color === 'red' ? 'text-red-900' : 'text-blue-900'
                      }`}>
                        {actividad.titulo}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{actividad.descripcion}</p>
                      <p className="text-xs text-gray-400 mt-1">{actividad.tiempo}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PanelContenido>

        </div>
      </div>
    </div>
  );
}

export default DashboardDemo;