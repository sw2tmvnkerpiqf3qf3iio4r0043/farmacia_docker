import { useContext } from "react";
import { MedicamentoContext } from "./medicamentoContextStore";

export function useMedicamentos() {
  const context = useContext(MedicamentoContext);
  if (!context) throw new Error("useMedicamentos debe usarse dentro de MedicamentoProvider");
  return context;
}
