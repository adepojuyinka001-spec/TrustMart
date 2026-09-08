"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface MobileNavState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MobileNavContext = createContext<MobileNavState | undefined>(undefined);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <MobileNavContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((v) => !v),
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav(): MobileNavState {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("useMobileNav must be used within MobileNavProvider");
  return ctx;
}
