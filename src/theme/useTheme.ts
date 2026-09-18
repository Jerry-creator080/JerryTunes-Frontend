import { useThemeContext } from '../context/ThemeContext';
import { colors, typography, spacing, radius } from './index';

export const useTheme = () => {
  const { isDark } = useThemeContext();
  
  return {
    colors: isDark ? colors.dark : colors.light,
    typography,
    spacing,
    radius,
    isDark,
  };
};
