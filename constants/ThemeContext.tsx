import React, { createContext, useContext } from 'react';
import { Colors, LightColors } from './theme';

type ThemeColors = typeof Colors;

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  setLightMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LightColors,
  isDark: false,
  setLightMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const setLightMode = () => {};
  const isDark = false;
  const colors = LightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, setLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

export function useTheme() {
  return useContext(ThemeContext);
}
