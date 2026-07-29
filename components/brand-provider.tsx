"use client";

import { createContext, useContext } from "react";

type Brand = { appName: string; logoUrl: string | null };

const BrandContext = createContext<Brand>({ appName: "Sinal", logoUrl: null });

export function BrandProvider({
  appName,
  logoUrl,
  children,
}: Brand & { children: React.ReactNode }) {
  return <BrandContext.Provider value={{ appName, logoUrl }}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}
