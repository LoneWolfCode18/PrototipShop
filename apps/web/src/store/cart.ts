import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
  variantId: string;
  productName: string;
  size: string;
  color: string;
  unitPrice: number;
  qty: number;
  image?: string;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
};

// Carrito en el navegador (localStorage). El servidor siempre recalcula precios y stock.
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.variantId === item.variantId ? { ...i, qty: i.qty + qty } : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, qty }] };
        }),
      setQty: (variantId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.variantId !== variantId)
              : s.items.map((i) => (i.variantId === variantId ? { ...i, qty } : i)),
        })),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0),
      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: 'rkeens-cart' },
  ),
);
