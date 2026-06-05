import { useSyncExternalStore } from "react";

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
};

const STORAGE_KEY = "shalom_cart_v1";

function read(): CartState {
  if (typeof localStorage === "undefined") return { mesaToken: null, items: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mesaToken: null, items: [] };
    return JSON.parse(raw) as CartState;
  } catch {
    return { mesaToken: null, items: [] };
  }
}

let state: CartState = read();
const listeners = new Set<() => void>();

function emit() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const serverSnapshot: CartState = { mesaToken: null, items: [] };

export function useCart() {
  return useSyncExternalStore(subscribe, () => state, () => serverSnapshot);
}

export const cart = {
  setMesa(token: string) {
    const items = state.mesaToken && state.mesaToken !== token ? [] : state.items;
    state = { mesaToken: token, items };
    emit();
  },
  add(item: CartItem) {
    const items = [...state.items];
    const idx = items.findIndex(
      (i) => i.produto_id === item.produto_id && (i.observacao || "") === (item.observacao || ""),
    );
    if (idx >= 0) items[idx] = { ...items[idx], quantidade: items[idx].quantidade + item.quantidade };
    else items.push(item);
    state = { ...state, items };
    emit();
  },
  remove(produto_id: string, observacao?: string) {
    state = {
      ...state,
      items: state.items.filter((i) => !(i.produto_id === produto_id && (i.observacao || "") === (observacao || ""))),
    };
    emit();
  },
  setQty(produto_id: string, observacao: string | undefined, qty: number) {
    state = {
      ...state,
      items: state.items.map((i) =>
        i.produto_id === produto_id && (i.observacao || "") === (observacao || "")
          ? { ...i, quantidade: Math.max(1, qty) }
          : i,
      ),
    };
    emit();
  },
  clear() {
    state = { ...state, items: [] };
    emit();
  },
  total() {
    return state.items.reduce((s, i) => s + i.preco * i.quantidade, 0);
  },
};

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
