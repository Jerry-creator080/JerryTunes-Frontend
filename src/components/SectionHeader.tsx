import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface SectionHeaderProps {
  title: string;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, style }) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <Text
      style={[
        styles.title,
        {
          color: colors.text,
          fontSize: typography.sizes.xl,
          fontWeight: typography.weights.bold,
          marginBottom: spacing.md,
        },
        style,
      ]}
    >
      {title}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    // Basic structural styles if needed, rest is injected via theme
  },
});
