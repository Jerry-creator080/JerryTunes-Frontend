import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = '@JerryTunes_theme_pref';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themePreference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPref(stored);
      }
    } catch (e) {
      console.error('Failed to load theme', e);
    }
  };

  const setThemePreference = async (pref: ThemePreference) => {
    try {
      setPref(pref);
      await AsyncStorage.setItem(THEME_KEY, pref);
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const isDark = themePreference === 'system' ? systemScheme === 'dark' : themePreference === 'dark';

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
