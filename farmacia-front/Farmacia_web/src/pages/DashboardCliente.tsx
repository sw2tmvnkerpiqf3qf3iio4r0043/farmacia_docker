import { useEffect, useState } from 'react';
import ProductModal from "../components/ProductModal";
import { useMedicamentos } from "../context/MedicamentoContext";
import { useCart } from "../context/CartContext";
import apiClient from "../api/apiClient";

interface Categoria {
  id_categoria: number;
  nombre: string;
  id_categoria_padre: number | null;
}

interface Oferta {
  id_oferta: number;
  nombre_oferta: string;
  porcentaje_descuento: number | string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: number | boolean | string;
}

function DashboardCliente() {
  const { medicamentos, cargando } = useMedicamentos();
  const { addItem } = useCart();
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ofertaActiva, setOfertaActiva] = useState<Oferta | null>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaExpandida, setCategoriaExpandida] = useState<number | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // 1. Cargar categorías
        const catsRes = await apiClient.get('/categoria');
        setCategorias(catsRes.data);

        // 2. Cargar ofertas activas
        const ofertasRes = await apiClient.get<Oferta[]>('/oferta');
        const ofertasData = ofertasRes.data;
        
        // Buscar la primera oferta activa
        const activa = ofertasData.find((o) => {
          const activo = o.activo || o.activo === 1 || o.activo === "1";
          return activo;
        });
        
        if (activa) {
          setOfertaActiva(activa);
          console.log('✅ Oferta activa encontrada:', activa);
        } else {
          console.log('⚠️ No hay ofertas activas');
        }
      } catch (error) {
        console.error('❌ Error al cargar datos:', error);
      }
    };
    cargarDatos();
  }, []);

  const categoriasPrincipales = categorias.filter((c: any) => !c.id_categoria_padre);
  const obtenerHijas = (idPadre: number) => categorias.filter((c: any) => c.id_categoria_padre === idPadre);

  const medicamentosFiltrados = medicamentos.filter((med: any) => {
    const nombreComercial = (med.nombreComercial || med.nombre_comercial || med.nombre || "").toLowerCase();
    const nombreGenerico = (med.nombreGenerico || med.nombre_generico || "").toLowerCase();
    const idCat = med.idCategoria || med.id_categoria;

    const coincideBusqueda = nombreComercial.includes(busqueda.toLowerCase()) || nombreGenerico.includes(busqueda.toLowerCase());
    
    let coincideCategoria = true;
    if (categoriaSeleccionada === 'ofertas') {
      // Si hay oferta activa, mostrar todos los medicamentos
      coincideCategoria = ofertaActiva !== null;
    } else if (categoriaSeleccionada !== 'todas') {
      const catId = parseInt(categoriaSeleccionada);
      const hijas = obtenerHijas(catId).map((h: any) => h.id_categoria);
      coincideCategoria = idCat === catId || hijas.includes(idCat);
    }
    
    return coincideBusqueda && coincideCategoria;
  });

  const handleVerProducto = (producto: any) => {
    setProductoSeleccionado(producto);
    setModalAbierto(true);
  };

  const handleAgregarAlCarrito = (producto: any, cantidad: number) => {
    addItem(
      {
        idMedicamento: producto.idMedicamento || producto.id_medicamento || producto.id,
        nombreComercial: producto.nombreComercial || producto.nombre_comercial || producto.nombre || "Medicamento",
        nombreGenerico: producto.nombreGenerico || producto.nombre_generico || "",
        precioVenta: Number(producto.precioVenta || producto.precio_venta || 0),
        stock: Number(producto.stock || 0),
        requiereReceta: Boolean(producto.requiereReceta || producto.requiere_receta),
        imagen: producto.imagen || producto.imagen_url || undefined,
      },
      cantidad
    );
    alert(`Se agregaron ${cantidad} unidad(es) de ${producto.nombreComercial || "medicamento"} al carrito.`);
  };

  const iconosCategoria: Record<string, string> = {
    'analgésicos': '', 'gastrointestinales': '', 'antibióticos': '💉',
    'antiinflamatorios': '🩹', 'antigripales': '🤧', 'cardiovasculares': '❤️',
    'vitaminas': '🍊', 'dermocosmética': '🧴', 'higiene': '🧼', 'bebé': '', 'puericultura': '🍼',
  };

  const obtenerIconoCategoria = (nombre: string) => {
    const lower = nombre.toLowerCase();
    for (const key in iconosCategoria) {
      if (lower.includes(key)) return iconosCategoria[key];
    }
    return '';
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

  const descuento = ofertaActiva ? Number(ofertaActiva.porcentaje_descuento || 0) : 0;

  return (
    <div className="w-full max-w-full">
      {/* Barra de búsqueda */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="🔍 ¿Qué estás buscando?"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 pl-12"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition">
            Buscar
          </button>
        </div>
      </div>

      {/* Categorías */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">📂 Categorías</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => { setCategoriaSeleccionada('todas'); setCategoriaExpandida(null); }}
            className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              categoriaSeleccionada === 'todas' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-gray-200'
            }`}
          >
             Todas
          </button>
          
          <button
            onClick={() => { setCategoriaSeleccionada('ofertas'); setCategoriaExpandida(null); }}
            className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              categoriaSeleccionada === 'ofertas' ? 'bg-red-500 text-white shadow-lg scale-105' : 'bg-white text-red-600 hover:bg-red-50 border-2 border-red-200'
            }`}
          >
            🏷️ Ofertas {ofertaActiva ? `(${descuento}% OFF)` : '(0)'}
          </button>

          {categoriasPrincipales.map((cat: any) => {
            const hijas = obtenerHijas(cat.id_categoria);
            const tieneHijas = hijas.length > 0;
            const estaExpandida = categoriaExpandida === cat.id_categoria;
            const estaSeleccionada = categoriaSeleccionada === cat.id_categoria.toString();

            return (
              <div key={cat.id_categoria} className="flex flex-col">
                <button
                  onClick={() => {
                    if (tieneHijas) setCategoriaExpandida(estaExpandida ? null : cat.id_categoria);
                    setCategoriaSeleccionada(cat.id_categoria.toString());
                  }}
                  className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
                    estaSeleccionada ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-gray-200'
                  }`}
                >
                  {obtenerIconoCategoria(cat.nombre)} {cat.nombre}
                  {tieneHijas && <span className="text-xs opacity-70">{estaExpandida ? '▲' : '▼'}</span>}
                </button>

                {tieneHijas && estaExpandida && (
                  <div className="flex flex-wrap gap-2 mt-2 ml-4 pl-4 border-l-2 border-blue-300">
                    {hijas.map((hija: any) => (
                      <button
                        key={hija.id_categoria}
                        onClick={() => setCategoriaSeleccionada(hija.id_categoria.toString())}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                          categoriaSeleccionada === hija.id_categoria.toString()
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        }`}
                      >
                        {obtenerIconoCategoria(hija.nombre)} {hija.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Productos */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {categoriaSeleccionada === 'ofertas' 
              ? `🏷️ Medicamentos en Oferta (${descuento}% OFF)` 
              : `💊 Medicamentos (${medicamentosFiltrados.length})`}
          </h2>
          {categoriaSeleccionada === 'ofertas' && ofertaActiva && (
            <span className="text-sm text-gray-500">
              {ofertaActiva.nombre_oferta} - {medicamentosFiltrados.length} producto(s)
            </span>
          )}
        </div>
        
        {medicamentosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl text-gray-600 font-medium">
              {categoriaSeleccionada === 'ofertas' 
                ? (ofertaActiva ? 'No hay medicamentos disponibles' : 'No hay ofertas activas actualmente')
                : 'No se encontraron medicamentos'}
            </p>
            {categoriaSeleccionada === 'ofertas' && !ofertaActiva && (
              <p className="text-sm text-gray-500 mt-2">Activa una oferta desde el panel de administración</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {medicamentosFiltrados.map((med: any) => {
              const idMed = med.idMedicamento || med.id_medicamento || med.id;
              const nombreComercial = med.nombreComercial || med.nombre_comercial || med.nombre || "Sin nombre";
              const nombreGenerico = med.nombreGenerico || med.nombre_generico || "";
              const precioVenta = Number(med.precioVenta || med.precio_venta || 0);
              const stockNum = Number(med.stock || 0);
              const idCat = med.idCategoria || med.id_categoria;
              const imagen = med.imagen || med.imagen_url || null;
              
              const colorStock = stockNum > 10 ? 'bg-green-500' : stockNum > 5 ? 'bg-yellow-500' : 'bg-red-500';
              const categoriaObj = categorias.find((c: any) => c.id_categoria === idCat);
              const categoria = categoriaObj ? categoriaObj.nombre : 'General';
              
              const tieneOferta = categoriaSeleccionada === 'ofertas' && ofertaActiva !== null;
              const precioConDescuento = precioVenta * (1 - descuento / 100);

              return (
                <div 
                  key={idMed} 
                  className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 group cursor-pointer relative"
                  onClick={() => handleVerProducto(med)}
                >
                  {tieneOferta && (
                    <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      ️ OFERTA
                    </div>
                  )}

                  <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden rounded-t-xl">
                    {imagen ? (
                      <img 
                        src={imagen} 
                        alt={nombreComercial}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e: any) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">💊</div>
                    )}
                    <div className={`absolute top-2 right-2 ${colorStock} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                      {stockNum}
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-2 h-10">{nombreComercial}</h3>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-1">{nombreGenerico}</p>
                    <p className="text-xs text-gray-600 mb-2">{obtenerIconoCategoria(categoria)} {categoria}</p>
                    
                    <div className="mt-3">
                      {tieneOferta && descuento > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-400 line-through">Bs. {precioVenta.toFixed(2)}</p>
                          <p className="text-lg font-bold text-red-600">Bs. {precioConDescuento.toFixed(2)}</p>
                          <span className="inline-block bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{descuento}% OFF</span>
                        </div>
                      ) : (
                        <p className="text-lg font-bold text-blue-600">Bs. {precioVenta.toFixed(2)}</p>
                      )}
                    </div>

                    <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition">
                      Ver más
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ProductModal
        producto={productoSeleccionado}
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onAdd={handleAgregarAlCarrito}
      />
    </div>
  );
}

export default DashboardCliente;