import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useAudio } from '../context/AudioContext';
import { useAudioPlayerStatus } from 'expo-audio';
import { useLibrary } from '../context/LibraryContext';
import { useOffline } from '../context/OfflineContext';
import { Artwork } from '../components/Artwork';
import { IconButton } from '../components/IconButton';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = width - 48;

const parseDurationToMs = (durationStr: string): number => {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  } else if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return 0;
};

export const NowPlayingScreen = () => {
  const { colors, typography, spacing } = useTheme();
  const { 
    currentTrack, player, isResolving,
    pause, resume, seek, next, previous, 
    shuffleMode, repeatMode, toggleShuffle, toggleRepeat 
  } = useAudio();
  const status = useAudioPlayerStatus(player);
  
  const [localTrackId, setLocalTrackId] = React.useState(currentTrack?.id);
  const [staleLock, setStaleLock] = React.useState(false);

  React.useEffect(() => {
    if (currentTrack?.id !== localTrackId) {
      setLocalTrackId(currentTrack?.id);
      setStaleLock(true);
    }
  }, [currentTrack?.id, localTrackId]);

  React.useEffect(() => {
    // Release the stale lock when the native player actually resets its progress back to near zero.
    // If user seeks before it plays, staleLock might stay, but we clear it aggressively on any < 1 time.
    if (staleLock && status.currentTime < 1) {
      setStaleLock(false);
    }
  }, [status.currentTime, staleLock]);

  const isPlaying = status.playing || isResolving;
  const position = isResolving || staleLock ? 0 : status.currentTime * 1000;
  
  // Natively, AVPlayer miscalculates remote VBR m4a duration (often exactly doubling it).
  // We use the absolute source of truth from YouTube metadata instead.
  const parsedDuration = currentTrack?.duration ? parseDurationToMs(currentTrack.duration) : 0;
  const duration = parsedDuration > 0 ? parsedDuration : status.duration * 1000;
  const { isFavorite, toggleFavorite } = useLibrary();
  const { downloadProgress } = useOffline();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [isScrubbing, setIsScrubbing] = React.useState(false);
  const [scrubPosition, setScrubPosition] = React.useState(0);
  const displayPosition = isScrubbing ? scrubPosition : position;

  const isFav = currentTrack ? isFavorite(currentTrack.id) : false;

  if (!currentTrack) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.text }}>No track playing</Text>
      </View>
    );
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <IconButton name="chevron-down" size={32} onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: typography.sizes.sm }]}>
          {currentTrack.album}
        </Text>
        <IconButton name="ellipsis-horizontal" size={24} onPress={() => {}} />
      </View>

      {/* Artwork */}
      <View style={[styles.artworkContainer, { marginVertical: spacing.xl }]}>
        <Artwork key={currentTrack.id} url={currentTrack.artworkUrl} size={ARTWORK_SIZE} style={styles.artwork} />
      </View>

      {/* Info */}
      <View style={[styles.infoContainer, { paddingHorizontal: spacing.lg }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.xl }]} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={[styles.artist, { color: colors.primary, fontSize: typography.sizes.md }]} numberOfLines={1}>
              {isResolving ? 'Loading...' : currentTrack.artist}
            </Text>
          </View>
          <IconButton 
            name={isFav ? "heart" : "heart-outline"} 
            size={28} 
            color={isFav ? colors.primary : colors.text}
            onPress={() => toggleFavorite(currentTrack!)} 
          />
        </View>
      </View>

      {/* Progress */}
      <View style={[styles.progressContainer, { paddingHorizontal: spacing.lg }]}>
        {downloadProgress[currentTrack.id] !== undefined && downloadProgress[currentTrack.id] > 0 && downloadProgress[currentTrack.id] < 1 && (
          <View style={{
            position: 'absolute',
            left: spacing.lg,
            height: 4,
            top: 18,
            backgroundColor: colors.primary,
            opacity: 0.3,
            borderRadius: 2,
            width: `${downloadProgress[currentTrack.id] * 100}%`,
            maxWidth: width - spacing.lg * 2
          }} />
        )}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={displayPosition}
          onValueChange={(val) => {
            if (!isScrubbing) setIsScrubbing(true);
            setScrubPosition(val);
          }}
          onSlidingComplete={async (val) => {
            setScrubPosition(val);
            await seek(val);
            // Shield against stale native status events snapping the UI backwards
            setTimeout(() => {
              setIsScrubbing(false);
            }, 500);
          }}
          minimumTrackTintColor={colors.text}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.text}
        />
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatTime(displayPosition)}</Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>-{formatTime(duration - displayPosition)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controlsContainer, { paddingHorizontal: spacing.xl, marginBottom: insets.bottom + spacing.lg }]}>
        <IconButton 
          name="shuffle" 
          size={24} 
          color={shuffleMode ? colors.primary : colors.textSecondary} 
          onPress={toggleShuffle} 
        />
        <IconButton name="play-back" size={40} onPress={previous} />
        <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.text }]} onPress={isPlaying ? pause : resume} activeOpacity={0.8}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={36} color={colors.background} style={{ marginLeft: isPlaying ? 0 : 4 }} />
        </TouchableOpacity>
        <IconButton name="play-forward" size={40} onPress={next} />
        <IconButton 
          name={repeatMode === 'one' ? "repeat-outline" : "repeat"} 
          size={24} 
          color={repeatMode !== 'none' ? colors.primary : colors.textSecondary} 
          onPress={toggleRepeat} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
  },
  headerTitle: {
    fontWeight: '600',
  },
  artworkContainer: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  artwork: {
    borderRadius: 16,
  },
  infoContainer: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  artist: {
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 24,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -8,
  },
  timeText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});