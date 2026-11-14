"use client";

import { create } from "zustand";

/** Opens/closes the mini-cart drawer from anywhere (e.g. after "add to bag"). Not persisted. */
interface CartUiState {
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
}

export const useCartUi = create<CartUiState>()((set) => ({
  open: false,
  openCart: () => set({ open: true }),
  closeCart: () => set({ open: false }),
}));
