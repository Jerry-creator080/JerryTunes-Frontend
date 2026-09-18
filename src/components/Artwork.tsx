import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';

interface ArtworkProps {
  url?: string;
  size?: number;
  style?: ViewStyle;
}

export const Artwork: React.FC<ArtworkProps> = ({ url, size = 60, style }) => {
  const { colors, radius } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, backgroundColor: colors.border, borderRadius: radius.md },
        style,
      ]}
    >
      {url ? (
        <Image source={{ uri: url }} style={[styles.image, { borderRadius: radius.md }]} />
      ) : (
        <Ionicons name="musical-notes" size={size * 0.5} color={colors.textSecondary} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
