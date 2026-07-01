import React, { createContext, useContext, useState, useEffect } from 'react';
import { Colors, LightColors } from './theme';
import { getProfile } from '../utils/storage';

type ThemeColors = typeof Colors;

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  setLightMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: Colors,
  isDark: true,
  setLightMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      // darkModeEnabled=false means user wants light mode (since app default is dark)
      if (p.isPremium && p.darkModeEnabled === false) {
        setLightMode(true);
      }
    });
  }, []);

  const isDark = !lightMode;
  const colors = lightMode ? LightColors : Colors;

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
