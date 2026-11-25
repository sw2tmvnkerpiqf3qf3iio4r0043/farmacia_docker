import { createContext } from "react";
import type { CartItem } from "../types/farmacia";

export interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, "cantidad">, cantidad?: number) => void;
  updateCantidad: (idMedicamento: number, cantidad: number) => void;
  removeItem: (idMedicamento: number) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);
