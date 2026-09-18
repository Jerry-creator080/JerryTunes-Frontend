import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export const SearchField: React.FC<SearchFieldProps> = ({ value, onChangeText, placeholder = 'Search...', style }) => {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md }, style]}>
      <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: colors.text, fontSize: typography.sizes.md, paddingVertical: spacing.sm }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        clearButtonMode="while-editing"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
  },
});
