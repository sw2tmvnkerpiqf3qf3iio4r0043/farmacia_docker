import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "../types/farmacia";

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, "cantidad">, cantidad?: number) => void;
  updateCantidad: (idMedicamento: number, cantidad: number) => void;
  removeItem: (idMedicamento: number) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "farmacia_cart";
const CartContext = createContext<CartContextType | undefined>(undefined);

function cargarCarrito(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(cargarCarrito);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "cantidad">, cantidad = 1) => {
    if (item.stock <= 0) return;

    setItems((prev) => {
      const existente = prev.find((i) => i.idMedicamento === item.idMedicamento);
      if (existente) {
        const nuevaCantidad = Math.min(existente.cantidad + cantidad, item.stock);
        return prev.map((i) =>
          i.idMedicamento === item.idMedicamento
            ? { ...i, ...item, cantidad: nuevaCantidad }
            : i
        );
      }
      return [...prev, { ...item, cantidad: Math.min(cantidad, item.stock) }];
    });
  };

  const updateCantidad = (idMedicamento: number, cantidad: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.idMedicamento === idMedicamento
            ? { ...item, cantidad: Math.max(0, Math.min(cantidad, item.stock)) }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  };

  const removeItem = (idMedicamento: number) => {
    setItems((prev) => prev.filter((item) => item.idMedicamento !== idMedicamento));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const { itemCount, total } = useMemo(
    () => ({
      itemCount: items.reduce((acc, item) => acc + item.cantidad, 0),
      total: Number(
        items.reduce((acc, item) => acc + item.precioVenta * item.cantidad, 0).toFixed(2)
      ),
    }),
    [items]
  );

  return (
    <CartContext.Provider
      value={{ items, itemCount, total, addItem, updateCantidad, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
}
