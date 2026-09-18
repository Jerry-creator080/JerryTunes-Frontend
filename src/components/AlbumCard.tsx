import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Artwork } from './Artwork';

interface AlbumCardProps {
  title: string;
  artist: string;
  artworkUrl?: string;
  onPress?: () => void;
}

export const AlbumCard = memo(({ title, artist, artworkUrl, onPress }: AlbumCardProps) => {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { marginRight: spacing.md }]} 
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Album ${title} by ${artist}`}
    >
      <Artwork url={artworkUrl} size={140} style={{ borderRadius: radius.md, marginBottom: spacing.sm }} />
      <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.md }]} numberOfLines={1}>{title}</Text>
      <Text style={[styles.artist, { color: colors.textSecondary, fontSize: typography.sizes.sm }]} numberOfLines={1}>{artist}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 140,
  },
  title: {
    fontWeight: '600',
  },
  artist: {
    marginTop: 2,
  },
});
