import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import type { ThemeContextValue } from "../types/theme";

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
