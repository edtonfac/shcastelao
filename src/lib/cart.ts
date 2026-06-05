import { create } from "zustand";

export type CartItem = {
  produto_id: string;
  nome: string;
  preco: number;
  quantidade: number;
  observacao?: string;
  foto_url?: string | null;
};

type CartState = {
  mesaToken: string | null;
  items: CartItem[];
  setMesa: (t: string) => void;
  add: (item: CartItem) => void;
  remove: (produto_id: string, observacao?: string) => void;
  setQty: (produto_id: string, observacao: string | undefined, qty: number) => void;
  clear: () => void;
  total: () => number;
};

const STORAGE_KEY = "shalom_cart_v1";

function load(): { mesaToken: string | null; items: CartItem[] } {
  if (typeof localStorage === "undefined") return { mesaToken: null, items: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mesaToken: null, items: [] };
    return JSON.parse(raw);
  } catch {
    return { mesaToken: null, items: [] };
  }
}

function persist(s: { mesaToken: string | null; items: CartItem[] }) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export const useCart = create<CartState>((set, get) => ({
  mesaToken: load().mesaToken,
  items: load().items,
  setMesa: (t) => {
    const current = get();
    // Se mudou de mesa, limpa carrinho
    const items = current.mesaToken && current.mesaToken !== t ? [] : current.items;
    set({ mesaToken: t, items });
    persist({ mesaToken: t, items });
  },
  add: (item) => {
    const items = [...get().items];
    const idx = items.findIndex((i) => i.produto_id === item.produto_id && (i.observacao || "") === (item.observacao || ""));
    if (idx >= 0) items[idx].quantidade += item.quantidade;
    else items.push(item);
    set({ items });
    persist({ mesaToken: get().mesaToken, items });
  },
  remove: (id, obs) => {
    const items = get().items.filter((i) => !(i.produto_id === id && (i.observacao || "") === (obs || "")));
    set({ items });
    persist({ mesaToken: get().mesaToken, items });
  },
  setQty: (id, obs, qty) => {
    const items = get().items.map((i) =>
      i.produto_id === id && (i.observacao || "") === (obs || "") ? { ...i, quantidade: Math.max(1, qty) } : i,
    );
    set({ items });
    persist({ mesaToken: get().mesaToken, items });
  },
  clear: () => {
    set({ items: [] });
    persist({ mesaToken: get().mesaToken, items: [] });
  },
  total: () => get().items.reduce((s, i) => s + i.preco * i.quantidade, 0),
}));

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
