'use client';

import { useState } from 'react';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  description?: string | null;
  category?: string | null;
}

export interface CartItem extends MenuItem {
  qty: number;
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const addToCart = (menu: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === menu.id);
      if (existing) return prev.map((c) => c.id === menu.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...menu, qty: 1 }];
    });
    setJustAdded(menu.id);
    setTimeout(() => setJustAdded(null), 600);
  };

  const removeFromCart = (menuId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === menuId);
      if (!existing) return prev;
      if (existing.qty === 1) return prev.filter((c) => c.id !== menuId);
      return prev.map((c) => c.id === menuId ? { ...c, qty: c.qty - 1 } : c);
    });
  };

  const clearCart = () => setCart([]);

  const getQty = (menuId: string) => cart.find((c) => c.id === menuId)?.qty ?? 0;

  return { cart, justAdded, totalItems, totalPrice, addToCart, removeFromCart, clearCart, getQty };
}
