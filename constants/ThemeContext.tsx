import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, LightColors } from './theme';

const DARK_MODE_KEY = 'user_dark_mode';

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
  const webThemeOverride = __DEV__ && Platform.OS === 'web' && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('theme')
    : null;
  const devDarkMode = process.env.EXPO_PUBLIC_FORCE_DARK_MODE === '1' || webThemeOverride === 'dark';

  const [isDark, setIsDark] = useState(devDarkMode);

  // Load saved preference on mount
  useEffect(() => {
    if (webThemeOverride === 'dark' || webThemeOverride === 'light') {
      setIsDark(webThemeOverride === 'dark');
      return;
    }
    AsyncStorage.getItem(DARK_MODE_KEY).then(val => {
      if (val !== null) setIsDark(val === 'true');
    }).catch(() => {});
  }, [webThemeOverride]);

  const setLightMode = (lightEnabled: boolean) => {
    const dark = !lightEnabled;
    setIsDark(dark);
    AsyncStorage.setItem(DARK_MODE_KEY, String(dark)).catch(() => {});
  };

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
