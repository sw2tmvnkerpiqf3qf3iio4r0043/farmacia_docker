import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem } from "../types/farmacia";
import { CartContext } from "./cartContextStore";

const STORAGE_KEY = "farmacia_cart";

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
    const qty = Math.max(1, Math.floor(cantidad));
    setItems((prev) => {
      const existente = prev.find((i) => i.idMedicamento === item.idMedicamento);
      if (existente) {
        const stock = Math.max(0, item.stock);
        const nuevaCantidad = Math.min(existente.cantidad + qty, stock);
        return prev.map((i) =>
          i.idMedicamento === item.idMedicamento
            ? { ...i, ...item, stock, cantidad: nuevaCantidad }
            : i
        );
      }
      const stock = Math.max(0, item.stock);
      return [...prev, { ...item, stock, cantidad: Math.min(qty, stock) }];
    });
  };

  const updateCantidad = (idMedicamento: number, cantidad: number) => {
    const qty = Math.floor(Number(cantidad));
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.idMedicamento !== idMedicamento) return item;
          if (!Number.isFinite(qty)) return item;
          const clamped = Math.max(0, Math.min(qty, item.stock));
          return { ...item, cantidad: clamped };
        })
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

  const { itemCount, total } = useMemo(() => {
    const count = items.reduce((acc, item) => acc + item.cantidad, 0);
    const sum = items.reduce((acc, item) => acc + Number(item.precioVenta) * item.cantidad, 0);
    return { itemCount: count, total: Number(sum.toFixed(2)) };
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, itemCount, total, addItem, updateCantidad, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}
