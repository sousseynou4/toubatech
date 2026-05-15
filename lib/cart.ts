'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Lightweight cart state, persisted in localStorage.
 * No external state library — just React + a shared event bus
 * so multiple components stay in sync without props drilling.
 */

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  grade: 'A' | 'B' | 'C';
  priceCents: number;
  imageUrl: string;
  quantity: number;
}

const STORAGE_KEY = 'tt_cart';
const EVENT_NAME = 'tt:cart:change';

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // Broadcast to all listeners in the current tab
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/**
 * Hook : returns the current cart and stable mutators.
 * Re-renders any component using it when the cart changes —
 * even from another component / another tab.
 */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readCart());
    setHydrated(true);

    const sync = () => setItems(readCart());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync); // cross-tab sync
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    const current = readCart();
    const existing = current.find((c) => c.productId === item.productId);
    let next: CartItem[];
    if (existing) {
      next = current.map((c) =>
        c.productId === item.productId ? { ...c, quantity: c.quantity + quantity } : c
      );
    } else {
      next = [...current, { ...item, quantity }];
    }
    writeCart(next);
  }, []);

  const removeItem = useCallback((productId: string) => {
    writeCart(readCart().filter((c) => c.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      writeCart(readCart().filter((c) => c.productId !== productId));
      return;
    }
    writeCart(
      readCart().map((c) => (c.productId === productId ? { ...c, quantity } : c))
    );
  }, []);

  const clearCart = useCallback(() => {
    writeCart([]);
  }, []);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCents = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  );

  return {
    items,
    totalQuantity,
    totalCents,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    hydrated, // true after localStorage read — avoids SSR mismatch
  };
}

/** Format cents as French euros (e.g. 47900 → "479 €") */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
