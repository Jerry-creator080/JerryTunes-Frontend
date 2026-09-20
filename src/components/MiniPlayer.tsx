import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useAudio } from '../context/AudioContext';
import { useAudioPlayerStatus } from 'expo-audio';
import { Artwork } from './Artwork';
import { IconButton } from './IconButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const MiniPlayer = () => {
  const { colors, typography, spacing, radius } = useTheme();
  const { currentTrack, pause, resume, player, isResolving, next, previous } = useAudio();
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  if (!currentTrack) return null;

  // Assuming tab bar height is roughly 49 + insets.bottom on iOS
  const bottomOffset = 49 + insets.bottom;

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.surface, 
          bottom: bottomOffset, 
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingHorizontal: spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        }
      ]} 
      activeOpacity={0.9}
      onPress={() => navigation.navigate('NowPlaying')}
    >
      <Artwork key={currentTrack.id} url={currentTrack.artworkUrl} size={40} style={{ borderRadius: radius.sm }} />
      <View style={[styles.info, { marginLeft: spacing.md }]}>
        <Text style={{ color: colors.text, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium }} numberOfLines={1}>{currentTrack.title}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }} numberOfLines={1}>
          {isResolving ? 'Loading...' : currentTrack.artist}
        </Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity 
          onPress={previous} 
          style={styles.controlButton}
          activeOpacity={0.7}
        >
          <Ionicons name="play-skip-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={isPlaying ? pause : resume} 
          style={styles.controlButton}
          activeOpacity={0.7}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={next} 
          style={styles.controlButton}
          activeOpacity={0.7}
        >
          <Ionicons name="play-skip-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  }
});