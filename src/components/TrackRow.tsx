import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Artwork } from './Artwork';
import { IconButton } from './IconButton';

interface TrackRowProps {
  title: string;
  artist: string;
  artworkUrl?: string;
  onPress?: () => void;
  onOptionsPress?: () => void;
  onArtistPress?: () => void;
}

export const TrackRow = memo(({ title, artist, artworkUrl, onPress, onOptionsPress, onArtistPress }: TrackRowProps) => {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]} 
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${title} by ${artist}`}
    >
      <Artwork url={artworkUrl} size={48} style={{ borderRadius: radius.sm }} />
      <View style={[styles.infoContainer, { marginLeft: spacing.md }]}>
        <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.md }]} numberOfLines={1}>{title}</Text>
        <TouchableOpacity onPress={onArtistPress} disabled={!onArtistPress} activeOpacity={0.7}>
          <Text style={[styles.artist, { color: colors.textSecondary, fontSize: typography.sizes.sm }]} numberOfLines={1}>{artist}</Text>
        </TouchableOpacity>
      </View>
      <IconButton name="ellipsis-horizontal" size={20} color={colors.textSecondary} accessibilityLabel="More options" onPress={onOptionsPress} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '500',
    marginBottom: 2,
  },
  artist: {},
});
