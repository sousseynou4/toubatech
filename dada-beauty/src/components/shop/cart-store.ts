'use client';
import { useSyncExternalStore } from 'react';

/** Panier local (navigateur). Les prix affichés sont indicatifs : la base recalcule tout à la commande. */
export interface CartLine { variantId: string; productSlug: string; name: string; variantName: string; unitPrice: number; quantity: number; imageUrl?: string | null }

const KEY = 'dada-cart-v1';
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;
const EMPTY: CartLine[] = [];

function read(): CartLine[] {
  if (typeof window === 'undefined') return EMPTY;
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache!;
}
function write(lines: CartLine[]) {
  cache = lines;
  try { window.localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* stockage indisponible */ }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; l(); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(l); window.removeEventListener('storage', onStorage); };
}

export const cart = {
  add(line: Omit<CartLine, 'quantity'>, quantity = 1) {
    const lines = [...read()];
    const existing = lines.find((l) => l.variantId === line.variantId);
    if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
    else lines.push({ ...line, quantity: Math.min(20, quantity) });
    write(lines.map((l) => ({ ...l })));
  },
  setQuantity(variantId: string, quantity: number) {
    write(read().map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(20, quantity)) } : l)));
  },
  remove(variantId: string) { write(read().filter((l) => l.variantId !== variantId)); },
  clear() { write([]); },
};

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
export function useCartCount(): number {
  return useCart().reduce((n, l) => n + l.quantity, 0);
}
