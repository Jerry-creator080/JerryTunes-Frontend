import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ThemeStyle = 'classic' | 'ios' | 'macos' | 'liquid_glass';

export interface GlassTokens {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  themeStyle: ThemeStyle;
  setThemeStyle: (style: ThemeStyle) => Promise<void>;
  glassOpacity: number;
  setGlassOpacity: (opacity: number) => Promise<void>;
  isDark: boolean;
  getGlassStyle: (variant?: 'card' | 'bar' | 'modal' | 'pill') => GlassTokens;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_PREF_KEY = '@JerryTunes_theme_pref';
const THEME_STYLE_KEY = '@JerryTunes_theme_style';
const GLASS_OPACITY_KEY = '@JerryTunes_glass_opacity';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themePreference, setPref] = useState<ThemePreference>('dark');
  const [themeStyle, setThemeStyleState] = useState<ThemeStyle>('liquid_glass');
  const [glassOpacity, setGlassOpacityState] = useState<number>(0.75);

  useEffect(() => {
    loadThemeSettings();
  }, []);

  const loadThemeSettings = async () => {
    try {
      const [storedPref, storedStyle, storedOpacity] = await Promise.all([
        AsyncStorage.getItem(THEME_PREF_KEY),
        AsyncStorage.getItem(THEME_STYLE_KEY),
        AsyncStorage.getItem(GLASS_OPACITY_KEY),
      ]);

      if (storedPref === 'light' || storedPref === 'dark' || storedPref === 'system') {
        setPref(storedPref);
      }
      if (storedStyle === 'classic' || storedStyle === 'ios' || storedStyle === 'macos' || storedStyle === 'liquid_glass') {
        setThemeStyleState(storedStyle);
      }
      if (storedOpacity !== null) {
        const parsed = parseFloat(storedOpacity);
        if (!isNaN(parsed) && parsed >= 0.2 && parsed <= 1.0) {
          setGlassOpacityState(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load theme settings', e);
    }
  };

  const setThemePreference = async (pref: ThemePreference) => {
    try {
      setPref(pref);
      await AsyncStorage.setItem(THEME_PREF_KEY, pref);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const setThemeStyle = async (style: ThemeStyle) => {
    try {
      setThemeStyleState(style);
      await AsyncStorage.setItem(THEME_STYLE_KEY, style);
    } catch (e) {
      console.error('Failed to save theme style', e);
    }
  };

  const setGlassOpacity = async (opacity: number) => {
    try {
      const clamped = Math.max(0.2, Math.min(1.0, opacity));
      setGlassOpacityState(clamped);
      await AsyncStorage.setItem(GLASS_OPACITY_KEY, clamped.toString());
    } catch (e) {
      console.error('Failed to save glass opacity', e);
    }
  };

  const isDark = themePreference === 'system' ? systemScheme === 'dark' : themePreference === 'dark';

  const getGlassStyle = (variant: 'card' | 'bar' | 'modal' | 'pill' = 'card'): GlassTokens => {
    const op = glassOpacity;

    if (themeStyle === 'classic') {
      return {
        backgroundColor: isDark ? '#1C1C1F' : '#FFFFFF',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        borderWidth: 0.5,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.1,
        shadowRadius: 8,
        elevation: 6,
      };
    }

    if (themeStyle === 'ios') {
      const bgAlpha = Math.max(0.65, op * 0.92);
      return {
        backgroundColor: isDark 
          ? `rgba(26, 26, 32, ${bgAlpha})` 
          : `rgba(248, 248, 250, ${bgAlpha})`,
        borderColor: isDark 
          ? `rgba(255, 255, 255, ${0.1 * op + 0.04})` 
          : `rgba(0, 0, 0, ${0.08 * op + 0.02})`,
        borderWidth: 0.5,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.4 : 0.08,
        shadowRadius: 12,
        elevation: 8,
      };
    }

    if (themeStyle === 'macos') {
      const bgAlpha = Math.max(0.7, op * 0.95);
      return {
        backgroundColor: isDark 
          ? `rgba(20, 20, 26, ${bgAlpha})` 
          : `rgba(242, 242, 246, ${bgAlpha})`,
        borderColor: isDark 
          ? `rgba(255, 255, 255, ${0.14 * op + 0.05})` 
          : `rgba(0, 0, 0, ${0.12 * op + 0.03})`,
        borderWidth: 0.75,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.45 : 0.12,
        shadowRadius: 16,
        elevation: 10,
      };
    }

    // Default: 'liquid_glass'
    const bgBase = isDark ? '24, 24, 32' : '255, 255, 255';
    const borderBase = isDark ? '255, 255, 255' : '0, 0, 0';
    const borderAlpha = Math.min(0.28, 0.12 * op + 0.06);

    return {
      backgroundColor: `rgba(${bgBase}, ${op})`,
      borderColor: `rgba(${borderBase}, ${borderAlpha})`,
      borderWidth: 0.75,
      shadowColor: isDark ? '#000000' : '#888888',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.55 * op : 0.15 * op,
      shadowRadius: 18,
      elevation: 14,
    };
  };

  return (
    <ThemeContext.Provider value={{
      themePreference,
      setThemePreference,
      themeStyle,
      setThemeStyle,
      glassOpacity,
      setGlassOpacity,
      isDark,
      getGlassStyle,
    }}>
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
