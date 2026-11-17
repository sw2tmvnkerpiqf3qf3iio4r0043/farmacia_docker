import { useState, useEffect, useRef } from "react";
import PanelContenido from "../components/PanelContenido";
import MedicamentoModal from "../components/MedicamentoModal";
import apiClient from "../api/apiClient";

interface Categoria {
  id_categoria: number;
  nombre: string;
}

interface Medicamento {
  idMedicamento: number;
  codigoBarras: string;
  nombreComercial: string;
  nombreGenerico: string;
  presentacion: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  requiereReceta: boolean;
  imagen: string;
  idCategoria: number;
  activo: boolean;
}

function Medicamento() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [medicamentoAEliminar, setMedicamentoAEliminar] = useState<number | null>(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<string>("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formulario, setFormulario] = useState({
    codigoBarras: "",
    nombreComercial: "",
    nombreGenerico: "",
    presentacion: "",
    precioCompra: "",
    precioVenta: "",
    stock: "",
    requiereReceta: false,
    imagen: "",
    idCategoria: "",
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [medsRes, catsRes] = await Promise.all([
        apiClient.get("/medicamento"),
        apiClient.get("/categoria"),
      ]);
      setMedicamentos(medsRes.data);
      setCategorias(catsRes.data);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      alert("Error al cargar los datos del servidor");
    } finally {
      setCargando(false);
    }
  };

  const medicamentosFiltrados = medicamentos.filter(
    (med) =>
      med.nombreComercial.toLowerCase().includes(busqueda.toLowerCase()) ||
      med.codigoBarras.includes(busqueda) ||
      med.nombreGenerico.toLowerCase().includes(busqueda.toLowerCase())
  );

  const limpiarFormulario = () => {
    setFormulario({
      codigoBarras: "",
      nombreComercial: "",
      nombreGenerico: "",
      presentacion: "",
      precioCompra: "",
      precioVenta: "",
      stock: "",
      requiereReceta: false,
      imagen: "",
      idCategoria: "",
    });
    setVistaPrevia("");
    setEditandoId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormulario((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubirImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setVistaPrevia(objectUrl);

    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede superar los 5MB");
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Solo se permiten imágenes (JPEG, JPG, PNG, GIF, WEBP)");
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const formData = new FormData();
    formData.append("imagen", file);

    try {
      setSubiendoImagen(true);
      const response = await apiClient.post("/upload/medicamento", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        const imageUrl = response.data.url;
        setFormulario((prev) => ({ ...prev, imagen: imageUrl }));
        alert("✅ Imagen subida correctamente");
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Error al subir la imagen");
      setVistaPrevia("");
    } finally {
      setSubiendoImagen(false);
    }
  };

  const handleGuardar = async () => {
    const datos = {
      codigoBarras: formulario.codigoBarras,
      nombreComercial: formulario.nombreComercial,
      nombreGenerico: formulario.nombreGenerico,
      presentacion: formulario.presentacion,
      precioCompra: parseFloat(formulario.precioCompra),
      precioVenta: parseFloat(formulario.precioVenta),
      stock: parseInt(formulario.stock) || 0,
      requiereReceta: formulario.requiereReceta,
      imagen: formulario.imagen || null,
      idCategoria: parseInt(formulario.idCategoria) || 1,
      activo: true,
    };

    try {
      if (editandoId) {
        await apiClient.put(`/medicamento/${editandoId}`, datos);
        alert("✅ Producto actualizado correctamente");
      } else {
        await apiClient.post("/medicamento", datos);
        alert("✅ Producto agregado correctamente");
      }

      await cargarDatos();
      setModalAbierto(false);
      limpiarFormulario();
    } catch (error: any) {
      const mensaje =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Error desconocido";
      alert(`❌ Error: ${mensaje}`);
    }
  };

  const handleAbrirModalAgregar = () => {
    limpiarFormulario();
    setModalAbierto(true);
  };

  const handleEditar = (med: Medicamento) => {
    setFormulario({
      codigoBarras: med.codigoBarras || "",
      nombreComercial: med.nombreComercial || "",
      nombreGenerico: med.nombreGenerico || "",
      presentacion: med.presentacion || "",
      precioCompra: med.precioCompra?.toString() || "",
      precioVenta: med.precioVenta?.toString() || "",
      stock: (med.stock || 0).toString(),
      requiereReceta: med.requiereReceta || false,
      imagen: med.imagen || "",
      idCategoria: med.idCategoria?.toString() || "",
    });

    if (med.imagen) {
      setVistaPrevia(med.imagen);
    }

    setEditandoId(med.idMedicamento);
    setModalAbierto(true);
  };

  const handleDuplicar = async (med: Medicamento) => {
    const duplicado = {
      codigoBarras: med.codigoBarras + "-COPY",
      nombreComercial: med.nombreComercial + " (Copia)",
      nombreGenerico: med.nombreGenerico,
      presentacion: med.presentacion,
      precioCompra: med.precioCompra,
      precioVenta: med.precioVenta,
      stock: med.stock || 0,
      requiereReceta: med.requiereReceta,
      imagen: med.imagen || null,
      idCategoria: med.idCategoria,
      activo: true,
    };
    try {
      await apiClient.post("/medicamento", duplicado);
      alert("✅ Producto duplicado correctamente");
      await cargarDatos();
    } catch (error: any) {
      alert(error.response?.data?.message || "Error al duplicar");
    }
  };

  const confirmarEliminar = (id: number) => {
    setMedicamentoAEliminar(id);
  };

  const eliminarMed = async () => {
    if (medicamentoAEliminar) {
      try {
        await apiClient.delete(`/medicamento/${medicamentoAEliminar}`);
        alert("✅ Producto eliminado correctamente");
        await cargarDatos();
        setMedicamentoAEliminar(null);
      } catch (error: any) {
        alert(error.response?.data?.message || "Error al eliminar");
      }
    }
  };

  const getEstadoStock = (stock: number) => {
    if (stock <= 10) return { texto: "Crítico", color: "bg-red-100 text-red-700" };
    if (stock <= 50) return { texto: "Bajo", color: "bg-yellow-100 text-yellow-700" };
    return { texto: "Normal", color: "bg-green-100 text-green-700" };
  };

  const getCategoriaNombre = (idCategoria: number) => {
    const cat = categorias.find((c) => c.id_categoria === idCategoria);
    return cat ? cat.nombre : "Sin categoría";
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Conectando con el servidor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">💊 Gestión de Productos</h1>
          <p className="text-gray-600 mt-1">Administra el inventario de tu farmacia</p>
        </div>
        <button
          onClick={handleAbrirModalAgregar}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
        >
          <i className="fa-solid fa-plus"></i>
          Agregar Producto
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, código o genérico..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
        />
        <p className="text-sm text-gray-600 mt-2">
          Mostrando {medicamentosFiltrados.length} de {medicamentos.length} productos
        </p>
      </div>

      {/* Tabla de productos */}
      <PanelContenido titulo={`📋 Listado de Productos (${medicamentosFiltrados.length})`} colSpan={3}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                  Imagen
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Presentación
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  P. Venta
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Receta
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {medicamentosFiltrados.map((med) => {
                const estado = getEstadoStock(med.stock || 0);
                return (
                  <tr key={med.idMedicamento} className="hover:bg-blue-50 transition">
                    <td className="px-4 py-3">
                      {med.imagen ? (
                        <img
                          src={med.imagen}
                          alt={med.nombreComercial}
                          className="h-12 w-12 object-cover rounded-lg border mx-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect fill='%23e5e7eb' width='48' height='48'/%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                          <i className="fa-solid fa-image text-gray-400"></i>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{med.codigoBarras}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{med.nombreComercial}</p>
                      <p className="text-xs text-gray-500">{med.nombreGenerico}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {getCategoriaNombre(med.idCategoria)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{med.presentacion}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          (med.stock || 0) <= 5
                            ? "bg-red-100 text-red-700"
                            : (med.stock || 0) <= 10
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {med.stock || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${estado.color}`}
                      >
                        {estado.texto}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-700">
                      Bs. {Number(med.precioVenta).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          med.requiereReceta
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {med.requiereReceta ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleEditar(med)}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition"
                          title="Editar"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDuplicar(med)}
                          className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-semibold transition"
                          title="Duplicar"
                        >
                          📋 Copiar
                        </button>
                        <button
                          onClick={() => confirmarEliminar(med.idMedicamento)}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition"
                          title="Eliminar"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {medicamentosFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">No se encontraron productos con esa búsqueda.</p>
            </div>
          )}
        </div>
      </PanelContenido>

      {/* Modal para Agregar/Editar */}
      <MedicamentoModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={handleGuardar}
        formData={formulario}
        categorias={categorias}
        vistaPrevia={vistaPrevia}
        subiendoImagen={subiendoImagen}
        editandoId={editandoId}
        onInputChange={handleInputChange}
        onSubirImagen={handleSubirImagen}
        onLimpiarVistaPrevia={() => {
          setVistaPrevia("");
          setFormulario({ ...formulario, imagen: "" });
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        fileInputRef={fileInputRef}
      />

      {/* Modal de confirmación para eliminar */}
      {medicamentoAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                ¿Eliminar este producto?
              </h3>
              <p className="text-gray-600 mb-6">
                Esta acción no se puede deshacer. El producto será eliminado permanentemente del sistema.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMedicamentoAEliminar(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarMed}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition"
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Medicamento;