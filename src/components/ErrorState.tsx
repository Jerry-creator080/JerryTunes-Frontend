import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  marginTop?: number;
}

export const ErrorState = ({ 
  title = "Something went wrong", 
  message = "Please check your connection and try again.", 
  onRetry,
  marginTop = 64
}: ErrorStateProps) => {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={[styles.container, { marginTop }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="warning-outline" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.lg }]}>
        {title}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary, fontSize: typography.sizes.md }]}>
        {message}
      </Text>
      
      {onRetry && (
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.primary, borderRadius: radius.round }]} 
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Text style={[styles.retryText, { fontSize: typography.sizes.md }]}>Retry</Text>
        </TouchableOpacity>
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
  message: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  }
});
