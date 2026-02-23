"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { db } from "@/lib/database"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency"

interface CurrencyContextValue {
  currency: string
  formatAmount: (amount: number) => string
  symbol: string
  /** Call this after saving user settings so the currency updates globally */
  invalidate: () => void
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  formatAmount: (amount) => formatCurrency(amount, "USD"),
  symbol: "$",
  invalidate: () => {},
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState("USD")

  const load = useCallback(async () => {
    try {
      const settings = await db.getUserSettings()
      if (settings?.currency) {
        setCurrency(settings.currency)
      }
    } catch {
      // keep default
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const value: CurrencyContextValue = {
    currency,
    formatAmount: (amount) => formatCurrency(amount, currency),
    symbol: getCurrencySymbol(currency),
    invalidate: load,
  }

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
