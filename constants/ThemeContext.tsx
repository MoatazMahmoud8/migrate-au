import React, { createContext, useContext } from 'react';
import { Platform } from 'react-native';
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
  const localDarkMode = __DEV__ && (
    process.env.EXPO_PUBLIC_FORCE_DARK_MODE === '1' ||
    (Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('theme') === 'dark')
  );
  const isDark = localDarkMode;
  const colors = isDark ? Colors : LightColors;

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
