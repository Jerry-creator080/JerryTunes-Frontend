import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  marginTop?: number;
}

export const EmptyState = ({ icon, title, subtitle, marginTop = 64 }: EmptyStateProps) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { marginTop }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={48} color={colors.textSecondary} />
      </View>
      <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.lg }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.md }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  }
});
