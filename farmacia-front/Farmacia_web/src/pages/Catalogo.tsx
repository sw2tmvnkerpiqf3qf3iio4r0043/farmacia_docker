import { useState } from 'react';
import PanelContenido from "../components/PanelContenido";
import { useMedicamentos } from "../context/MedicamentoContext";
import { useCart } from "../context/CartContext";

function Catalogo() {
  const { medicamentos, cargando } = useMedicamentos();
  const { addItem } = useCart();
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  const medicamentosFiltrados = medicamentos.filter(med => {
    const coincideBusqueda = 
      med.nombreComercial.toLowerCase().includes(busqueda.toLowerCase()) ||
      med.nombreGenerico.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaFiltro ? med.tipoProducto === categoriaFiltro : true;
    return coincideBusqueda && coincideCategoria;
  });

  const categorias = [...new Set(medicamentos.map(m => m.tipoProducto).filter(Boolean))];

  if (cargando) {
    return <div className="flex items-center justify-center h-screen"><p className="text-xl">Cargando catálogo...</p></div>;
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Catálogo de Medicamentos</h2>
        <p className="text-gray-600 mt-1">Explora todos nuestros productos disponibles</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Buscar medicamento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Mostrando {medicamentosFiltrados.length} de {medicamentos.length} medicamentos
        </p>
      </div>

      <PanelContenido titulo={`Resultados (${medicamentosFiltrados.length})`} colSpan={3}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicamentosFiltrados.map((med) => (
            <div key={med.idMedicamento} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{med.nombreComercial}</h3>
                  <p className="text-xs text-gray-500">{med.nombreGenerico}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  (med.stock || 0) > 10 ? 'bg-green-100 text-green-700' :
                  (med.stock || 0) > 5 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {(med.stock || 0) > 10 ? 'Disponible' : (med.stock || 0) > 5 ? 'Pocas unidades' : 'Últimas unidades'}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Presentación:</span>
                  <span className="font-medium">{med.presentacion || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{med.tipoProducto || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Requiere receta:</span>
                  <span className={`font-medium ${med.requiereReceta ? 'text-yellow-600' : 'text-green-600'}`}>
                    {med.requiereReceta ? 'Sí' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">Precio:</span>
                  <span className="text-xl font-bold text-green-600">Bs. {Number(med.precioVenta).toFixed(2)}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={(med.stock || 0) <= 0}
                onClick={() =>
                  addItem({
                    idMedicamento: med.idMedicamento,
                    nombreComercial: med.nombreComercial,
                    nombreGenerico: med.nombreGenerico,
                    precioVenta: Number(med.precioVenta),
                    stock: Number(med.stock || 0),
                    requiereReceta: Boolean(med.requiereReceta),
                    imagen: med.imagen,
                  })
                }
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-semibold transition"
              >
                {(med.stock || 0) > 0 ? 'Agregar al carrito' : 'Sin stock'}
              </button>
            </div>
          ))}
        </div>
        {medicamentosFiltrados.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">No se encontraron medicamentos con esos filtros.</p>
          </div>
        )}
      </PanelContenido>
    </>
  );
}

export default Catalogo;