import { useEffect, useState, type ReactNode } from "react";
import type { Medicamento } from "../api/apiMedicamento";
import {
  getMedicamento,
  createMedicamento,
  updateMedicamento,
  deleteMedicamento,
} from "../api/apiMedicamento";
import { getApiErrorMessage } from "../api/apiErrors";
import { MedicamentoContext, type MedicamentoItem } from "./medicamentoContextStore";

function buildPayload(med: Partial<MedicamentoItem>) {
  return {
    codigoBarras: med.codigoBarras,
    nombreComercial: med.nombreComercial,
    nombreGenerico: med.nombreGenerico,
    descripcion: med.descripcion,
    idCategoria: med.idCategoria,
    tipoProducto: med.tipoProducto,
    presentacion: med.presentacion,
    precioCompra: med.precioCompra,
    precioVenta: med.precioVenta,
    stock: med.stock,
    requiereReceta: med.requiereReceta,
    imagen: med.imagen,
    activo: med.activo,
  } as Partial<Medicamento>;
}

export function MedicamentoProvider({ children }: { children: ReactNode }) {
  const [medicamentos, setMedicamentos] = useState<MedicamentoItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");
      const datos = await getMedicamento();
      setMedicamentos(datos as MedicamentoItem[]);
    } catch (err) {
      const mensaje = getApiErrorMessage(err, "No se pudieron cargar los medicamentos");
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarDatos();
  }, []);

  const agregarMedicamento = async (med: Partial<MedicamentoItem>): Promise<boolean> => {
    try {
      setError("");
      await createMedicamento(buildPayload(med));
      await cargarDatos();
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo crear el medicamento"));
      return false;
    }
  };

  const actualizarMedicamento = async (
    id: number,
    med: Partial<MedicamentoItem>
  ): Promise<boolean> => {
    try {
      setError("");
      await updateMedicamento(id, buildPayload(med));
      await cargarDatos();
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo actualizar el medicamento"));
      return false;
    }
  };

  const eliminarMedicamento = async (id: number): Promise<boolean> => {
    try {
      setError("");
      await deleteMedicamento(id);
      await cargarDatos();
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo eliminar el medicamento"));
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
        error,
        clearError: () => setError(""),
      }}
    >
      {children}
    </MedicamentoContext.Provider>
  );
}
