import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Medicamento } from "../api/apiMedicamento";
import {
  getMedicamento,
  createMedicamento,
  updateMedicamento,
  deleteMedicamento,
} from "../api/apiMedicamento";

interface MedicamentoContextType {
  medicamentos: Medicamento[];
  cargarDatos: () => Promise<void>;
  agregarMedicamento: (med: Partial<Medicamento>) => Promise<boolean>;
  actualizarMedicamento: (id: number, med: Partial<Medicamento>) => Promise<boolean>;
  eliminarMedicamento: (id: number) => Promise<boolean>;
  cargando: boolean;
}

const MedicamentoContext = createContext<MedicamentoContextType | undefined>(undefined);

export function MedicamentoProvider({ children }: { children: ReactNode }) {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const datos = await getMedicamento(); 
      setMedicamentos(datos);
    } catch (error) {
      console.error("Error al cargar:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const agregarMedicamento = async (med: Partial<Medicamento>): Promise<boolean> => {
    try {
      await createMedicamento({
        codigoBarras: med.codigoBarras,
        nombreComercial: med.nombreComercial,
        nombreGenerico: med.nombreGenerico,
        idCategoria: med.idCategoria || 1,
        tipoProducto: med.tipoProducto,
        presentacion: med.presentacion,
        precioCompra: med.precioCompra,
        precioVenta: med.precioVenta,
        stock: med.stock || 0,
        requiereReceta: med.requiereReceta,
        activo: med.activo !== undefined ? med.activo : true,
      });
      await cargarDatos();
      return true;
    } catch (error) {
      console.error("Error al crear:", error);
      return false;
    }
  };

  const actualizarMedicamento = async (
    id: number,
    med: Partial<Medicamento>
  ): Promise<boolean> => {
    try {
      await updateMedicamento(id, {
        codigoBarras: med.codigoBarras,
        nombreComercial: med.nombreComercial,
        nombreGenerico: med.nombreGenerico,
        idCategoria: med.idCategoria,
        tipoProducto: med.tipoProducto,
        presentacion: med.presentacion,
        precioCompra: med.precioCompra,
        precioVenta: med.precioVenta,
        stock: med.stock,
        requiereReceta: med.requiereReceta,
        activo: med.activo,
      });
      await cargarDatos();
      return true;
    } catch (error) {
      console.error("Error al actualizar:", error);
      return false;
    }
  };

  const eliminarMedicamento = async (id: number): Promise<boolean> => {
    try {
      await deleteMedicamento(id);
      await cargarDatos(); 
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || "Error desconocido";
      alert("ERROR AL ELIMINAR:\n" + msg);
      console.error("Detalle completo del error:", error);
      return false;
    }
  };

  return (
    <MedicamentoContext.Provider
      value={{
        medicamentos,
        cargarDatos,
        agregarMedicamento,
        actualizarMedicamento,
        eliminarMedicamento,
        cargando,
      }}
    >
      {cargando ? (
        <div className="p-10 text-center">Cargando datos del servidor...</div>
      ) : (
        children
      )}
    </MedicamentoContext.Provider>
  );
}

export function useMedicamentos() {
  const context = useContext(MedicamentoContext);
  if (!context) throw new Error("useMedicamentos debe usarse dentro de MedicamentoProvider");
  return context;
}