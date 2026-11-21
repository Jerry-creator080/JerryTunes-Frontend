import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  FlatList, 
  ScrollView,
  Alert
} from 'react-native';
import { useAudio } from '../context/AudioContext';
import { useAudioPlayerStatus } from 'expo-audio';
import { useLibrary } from '../context/LibraryContext';
import { useSleepTimer } from '../context/SleepTimerContext';
import { useOffline } from '../context/OfflineContext';
import { useAudioSettings } from '../context/AudioSettingsContext';
import { SleepTimerModal } from '../components/SleepTimerModal';
import { ActionSheet } from '../components/ActionSheet';
import { Artwork } from '../components/Artwork';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LyricsView } from '../components/LyricsView';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(width - 56, 340);

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
  const { 
    currentTrack, player, isResolving, playbackContext, queue,
    pause, resume, seek, next, previous, playTrack, clearQueue,
    removeFromQueue, reorderQueue, setFullQueue,
    shuffleMode, repeatMode, toggleShuffle, toggleRepeat 
  } = useAudio();
  const status = useAudioPlayerStatus(player);
  
  const [localTrackId, setLocalTrackId] = useState(currentTrack?.id);
  const [staleLock, setStaleLock] = useState(false);
  const [viewMode, setViewMode] = useState<'artwork' | 'lyrics' | 'queue'>('artwork');
  const [volume, setVolume] = useState(1.0);
  const [autoplay, setAutoplay] = useState(true);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);

  // 6-second queue undo state
  const [undoAction, setUndoAction] = useState<{
    type: 'clear' | 'remove';
    tracks: any[];
    removedIndex?: number;
    timer?: any;
  } | null>(null);

  const { isFavorite, toggleFavorite } = useLibrary();
  const { remainingMinutes, isEndOfTrack, timerEndMs } = useSleepTimer();
  const { isDownloaded, downloadTrack } = useOffline();
  const { streamingQuality, equalizerPreset, getQualityLabel, getPresetLabel } = useAudioSettings();

  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const handleClearWithUndo = () => {
    if (upcomingTracks.length === 0) return;
    const backup = [...upcomingTracks];
    clearQueue();
    if (undoAction?.timer) clearTimeout(undoAction.timer);
    const timer = setTimeout(() => {
      setUndoAction(null);
    }, 6000);
    setUndoAction({ type: 'clear', tracks: backup, timer });
  };

  const handleRemoveWithUndo = (item: any, index: number) => {
    removeFromQueue(index);
    if (undoAction?.timer) clearTimeout(undoAction.timer);
    const timer = setTimeout(() => {
      setUndoAction(null);
    }, 6000);
    setUndoAction({ type: 'remove', tracks: [item], removedIndex: index, timer });
  };

  const handleUndo = () => {
    if (!undoAction) return;
    if (undoAction.timer) clearTimeout(undoAction.timer);
    if (undoAction.type === 'clear') {
      setFullQueue(undoAction.tracks);
    } else if (undoAction.type === 'remove' && undoAction.tracks.length > 0) {
      const restored = [...queue];
      const idx = undoAction.removedIndex !== undefined ? undoAction.removedIndex : restored.length;
      restored.splice(idx, 0, undoAction.tracks[0]);
      setFullQueue(restored);
    }
    setUndoAction(null);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderQueue(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < upcomingTracks.length - 1) {
      reorderQueue(index, index + 1);
    }
  };

  useEffect(() => {
    if (currentTrack?.id !== localTrackId) {
      setLocalTrackId(currentTrack?.id);
      setStaleLock(true);
    }
  }, [currentTrack?.id, localTrackId]);

  useEffect(() => {
    if (staleLock && status.currentTime < 1) {
      setStaleLock(false);
    }
  }, [status.currentTime, staleLock]);

  const isPlaying = status.playing || isResolving;
  const position = isResolving || staleLock ? 0 : status.currentTime * 1000;
  
  const parsedDuration = currentTrack?.duration ? parseDurationToMs(currentTrack.duration) : 0;
  const duration = parsedDuration > 0 ? parsedDuration : status.duration * 1000;
  const displayPosition = isScrubbing ? scrubPosition : position;

  const isFav = currentTrack ? isFavorite(currentTrack.id) : false;

  if (!currentTrack) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={{ color: '#FFFFFF' }}>No track playing</Text>
      </View>
    );
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleRewind10 = async () => {
    const target = Math.max(0, displayPosition - 10000);
    setScrubPosition(target);
    await seek(target);
  };

  const handleForward10 = async () => {
    const target = Math.min(duration, displayPosition + 10000);
    setScrubPosition(target);
    await seek(target);
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    try {
      if (player && typeof (player as any).volume === 'number') {
        (player as any).volume = val;
      }
    } catch (e) {
      // Ignored
    }
  };

  // Up Next Queue list
  const upcomingTracks = playbackContext?.tracks?.length 
    ? playbackContext.tracks.filter(t => t.id !== currentTrack.id)
    : queue;

  const isCurrentDownloaded = currentTrack ? isDownloaded(currentTrack.id) : false;

  const playerOptions = [
    {
      label: timerEndMs || isEndOfTrack 
        ? `Sleep Timer: ${isEndOfTrack ? 'End of Song' : `${remainingMinutes}m left`} 🌙`
        : 'Set Sleep Timer 🌙',
      onPress: () => setShowSleepTimerModal(true),
    },
    {
      label: `Audio Quality: ${getQualityLabel(streamingQuality)}`,
      onPress: () => navigation.navigate('Settings'),
    },
    {
      label: `Sound Profile: ${getPresetLabel(equalizerPreset)}`,
      onPress: () => navigation.navigate('Settings'),
    },
    ...(currentTrack?.album ? [{
      label: `Go to Album: ${currentTrack.album}`,
      onPress: () => {
        navigation.navigate('AlbumDetail', { 
          albumId: currentTrack.album, 
          albumData: { title: currentTrack.album, artist: currentTrack.artist, artworkUrl: currentTrack.artworkUrl } 
        });
      }
    }] : []),
    {
      label: `Go to Artist: ${currentTrack?.artist || ''}`,
      onPress: () => {
        if (currentTrack?.artist) {
          navigation.navigate('Artist', { artistName: currentTrack.artist });
        }
      }
    },
    {
      label: isCurrentDownloaded ? 'Downloaded to Device (Offline Ready)' : 'Download Track (MP3)',
      onPress: () => {
        if (!isCurrentDownloaded && currentTrack) downloadTrack(currentTrack, 'mp3');
      }
    },
    {
      label: 'Watch Music Video',
      onPress: () => {
        if (currentTrack) navigation.navigate('Video', { track: currentTrack });
      }
    }
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 8 }]}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity 
          style={styles.circleBtn} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Center: Drag Pill OR Active Sleep Timer Pill */}
        {timerEndMs || isEndOfTrack ? (
          <TouchableOpacity
            style={styles.sleepTimerHeaderPill}
            onPress={() => setShowSleepTimerModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="moon" size={13} color="#FF9500" style={{ marginRight: 4 }} />
            <Text style={styles.sleepTimerHeaderText}>
              {isEndOfTrack ? 'End of Song' : `${remainingMinutes}m left`}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.dragPill} />
        )}

        <TouchableOpacity 
          style={styles.circleBtn} 
          onPress={() => setShowOptionsSheet(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main Middle Content: Artwork | Lyrics | Queue */}
      <View style={styles.middleContent}>
        {viewMode === 'artwork' ? (
          <View style={styles.artworkWrapper}>
            {/* Ambient Mesh Glow Backdrop */}
            <View style={styles.ambientMeshGlow} />

            <View style={styles.artworkContainer}>
              <Artwork 
                key={currentTrack.id} 
                url={currentTrack.artworkUrl} 
                size={ARTWORK_SIZE} 
                style={styles.artwork} 
              />
            </View>

            <View style={styles.trackInfoRow}>
              <View style={styles.trackTitleCol}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <Text style={styles.artistName} numberOfLines={1}>
                  {isResolving ? 'Buffering audio...' : currentTrack.artist}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.qualityPill}>
                    <Ionicons name="musical-notes" size={10} color="#A1A1AA" style={{ marginRight: 4 }} />
                    <Text style={styles.qualityPillText}>
                      {isCurrentDownloaded
                        ? 'OFFLINE • 320k'
                        : `${streamingQuality.toUpperCase()} • ${streamingQuality === 'ultra' ? '320k' : streamingQuality === 'high' ? '256k' : '128k'}`}
                    </Text>
                  </View>
                  {equalizerPreset !== 'flat' && (
                    <View style={styles.eqPill}>
                      <Text style={styles.eqPillText}>{getPresetLabel(equalizerPreset)}</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.heartBtn} 
                onPress={() => toggleFavorite(currentTrack)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isFav ? "heart" : "heart-outline"} 
                  size={26} 
                  color={isFav ? "#FF3B30" : "#FFFFFF"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : viewMode === 'lyrics' ? (
          <View style={styles.subViewContainer}>
            {/* Compact Header for Lyrics View */}
            <View style={styles.compactHeader}>
              <Artwork url={currentTrack.artworkUrl} size={44} style={styles.compactArt} />
              <View style={styles.compactTitleCol}>
                <Text style={styles.compactSongTitle} numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={styles.compactArtistName} numberOfLines={1}>{currentTrack.artist}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleFavorite(currentTrack)} style={styles.compactHeartBtn}>
                <Ionicons name={isFav ? "heart" : "heart-outline"} size={22} color={isFav ? "#FF3B30" : "#FFFFFF"} />
              </TouchableOpacity>
            </View>

            {/* Synced Lyrics Scroll Area */}
            <View style={styles.lyricsArea}>
              <LyricsView
                title={currentTrack.title}
                artist={currentTrack.artist}
                duration={duration}
                currentTimeMs={displayPosition}
                onSeek={(seekMs) => seek(seekMs)}
              />
            </View>
          </View>
        ) : (
          <View style={styles.subViewContainer}>
            {/* Compact Header for Queue View */}
            <View style={styles.compactHeader}>
              <Artwork url={currentTrack.artworkUrl} size={44} style={styles.compactArt} />
              <View style={styles.compactTitleCol}>
                <Text style={styles.compactSongTitle} numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={styles.compactArtistName} numberOfLines={1}>{currentTrack.artist}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleFavorite(currentTrack)} style={styles.compactHeartBtn}>
                <Ionicons name={isFav ? "heart" : "heart-outline"} size={22} color={isFav ? "#FF3B30" : "#FFFFFF"} />
              </TouchableOpacity>
            </View>

            {/* Queue Action Pill Buttons */}
            <View style={styles.queueActionsRow}>
              <TouchableOpacity 
                style={[styles.actionPill, shuffleMode && styles.actionPillActive]} 
                onPress={toggleShuffle}
                activeOpacity={0.7}
              >
                <Ionicons name="shuffle" size={18} color={shuffleMode ? "#000000" : "#FFFFFF"} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionPill, repeatMode !== 'none' && styles.actionPillActive]} 
                onPress={toggleRepeat}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={repeatMode === 'one' ? "repeat-outline" : "repeat"} 
                  size={18} 
                  color={repeatMode !== 'none' ? "#000000" : "#FFFFFF"} 
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionPill, autoplay && styles.actionPillActive]} 
                onPress={() => setAutoplay(!autoplay)}
                activeOpacity={0.7}
              >
                <Ionicons name="infinite" size={18} color={autoplay ? "#000000" : "#FFFFFF"} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionPill} 
                onPress={() => {}}
                activeOpacity={0.7}
              >
                <Ionicons name="options-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <TouchableOpacity onPress={handleClearWithUndo} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {/* 6-Second Undo Banner Toast */}
            {undoAction && (
              <View style={styles.undoToast}>
                <Ionicons name="arrow-undo-circle" size={20} color="#0A84FF" style={{ marginRight: 8 }} />
                <Text style={styles.undoText}>
                  {undoAction.type === 'clear' ? 'Queue cleared' : 'Song removed'}
                </Text>
                <TouchableOpacity onPress={handleUndo} style={styles.undoButton}>
                  <Text style={styles.undoButtonText}>Undo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Up Next List */}
            <View style={styles.queueSectionHeader}>
              <Text style={styles.queueSectionTitle}>Up Next</Text>
            </View>

            <FlatList
              data={upcomingTracks}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.queueListContent}
              renderItem={({ item, index }) => (
                <View style={styles.queueItemContainer}>
                  <TouchableOpacity 
                    style={styles.queueItemRow}
                    activeOpacity={0.7}
                    onPress={() => playTrack(item, playbackContext || undefined)}
                  >
                    <Artwork url={item.artworkUrl} size={42} style={styles.queueItemArt} />
                    <View style={styles.queueItemInfo}>
                      <Text style={styles.queueItemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.queueItemArtist} numberOfLines={1}>{item.artist}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Reorder and Delete Controls */}
                  <View style={styles.queueItemActions}>
                    {index > 0 && (
                      <TouchableOpacity 
                        onPress={() => handleMoveUp(index)} 
                        style={styles.queueControlBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      >
                        <Ionicons name="chevron-up" size={18} color="#8E8E93" />
                      </TouchableOpacity>
                    )}
                    {index < upcomingTracks.length - 1 && (
                      <TouchableOpacity 
                        onPress={() => handleMoveDown(index)} 
                        style={styles.queueControlBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      >
                        <Ionicons name="chevron-down" size={18} color="#8E8E93" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      onPress={() => handleRemoveWithUndo(item, index)} 
                      style={styles.queueControlBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#FF453A" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyQueueBox}>
                  <Text style={styles.emptyQueueText}>No upcoming tracks in queue</Text>
                </View>
              }
            />
          </View>
        )}
      </View>

      {/* Lower Controls Area: Scrubber, 5 Buttons, Volume, 3 Actions */}
      <View style={styles.bottomControlsArea}>
        {/* Progress Scrubber */}
        <View style={styles.scrubberContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : 1}
            value={displayPosition}
            onValueChange={(val) => {
              if (!isScrubbing) setIsScrubbing(true);
              setScrubPosition(val);
            }}
            onSlidingComplete={async (val) => {
              setScrubPosition(val);
              await seek(val);
              setTimeout(() => {
                setIsScrubbing(false);
              }, 500);
            }}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
            thumbTintColor="#FFFFFF"
          />
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>{formatTime(displayPosition)}</Text>
            <Text style={styles.timeLabel}>-{formatTime(duration - displayPosition)}</Text>
          </View>
        </View>

        {/* 5-Button Playback Controls Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity 
            onPress={handleRewind10} 
            style={styles.controlSubBtn} 
            activeOpacity={0.7}
          >
            <MaterialIcons name="replay-10" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={previous} 
            style={styles.controlSubBtn} 
            activeOpacity={0.7}
          >
            <Ionicons name="play-skip-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.largePlayBtn} 
            onPress={isPlaying ? pause : resume} 
            activeOpacity={0.85}
          >
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={34} 
              color="#000000" 
              style={{ marginLeft: isPlaying ? 0 : 3 }} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={next} 
            style={styles.controlSubBtn} 
            activeOpacity={0.7}
          >
            <Ionicons name="play-skip-forward" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleForward10} 
            style={styles.controlSubBtn} 
            activeOpacity={0.7}
          >
            <MaterialIcons name="forward-10" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Volume Slider */}
        <View style={styles.volumeRow}>
          <Ionicons name="volume-low" size={17} color="#71717A" />
          <Slider
            style={styles.volumeSlider}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={handleVolumeChange}
            minimumTrackTintColor="rgba(255, 255, 255, 0.7)"
            maximumTrackTintColor="rgba(255, 255, 255, 0.15)"
            thumbTintColor="#FFFFFF"
          />
          <Ionicons name="volume-high" size={17} color="#71717A" />
        </View>

        {/* Bottom 3-Action Row: Lyrics, AirPlay, Queue */}
        <View style={styles.bottomActionsRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, viewMode === 'lyrics' && styles.actionBtnActive]} 
            onPress={() => setViewMode(viewMode === 'lyrics' ? 'artwork' : 'lyrics')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="chatbubble-ellipses" 
              size={21} 
              color={viewMode === 'lyrics' ? "#000000" : "#8E8E93"} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <Ionicons name="radio-outline" size={21} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, viewMode === 'queue' && styles.actionBtnActive]} 
            onPress={() => setViewMode(viewMode === 'queue' ? 'artwork' : 'queue')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="list" 
              size={23} 
              color={viewMode === 'queue' ? "#000000" : "#8E8E93"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ActionSheet
        visible={showOptionsSheet}
        title={currentTrack?.title}
        options={playerOptions}
        onClose={() => setShowOptionsSheet(false)}
      />

      <SleepTimerModal
        visible={showSleepTimerModal}
        onClose={() => setShowSleepTimerModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragPill: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  sleepTimerHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 149, 0, 0.16)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 149, 0, 0.35)',
  },
  sleepTimerHeaderText: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  qualityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  qualityPillText: {
    color: '#D4D4D8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eqPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  eqPillText: {
    color: '#A1A1AA',
    fontSize: 10,
    fontWeight: '600',
  },
  middleContent: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 10,
  },
  artworkWrapper: {
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  ambientMeshGlow: {
    position: 'absolute',
    top: -20,
    width: ARTWORK_SIZE + 40,
    height: ARTWORK_SIZE + 40,
    borderRadius: (ARTWORK_SIZE + 40) / 2,
    backgroundColor: 'rgba(124, 92, 252, 0.18)',
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.75,
    shadowRadius: 40,
    elevation: 25,
  },
  artworkContainer: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 20,
  },
  artwork: {
    borderRadius: 16,
  },
  trackInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    paddingHorizontal: 4,
  },
  trackTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9E9EA4',
    marginTop: 4,
  },
  heartBtn: {
    padding: 6,
  },
  subViewContainer: {
    flex: 1,
    width: '100%',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  compactArt: {
    borderRadius: 8,
  },
  compactTitleCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  compactSongTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  compactArtistName: {
    fontSize: 13,
    color: '#9E9EA4',
    marginTop: 2,
  },
  compactHeartBtn: {
    padding: 4,
  },
  lyricsArea: {
    flex: 1,
  },
  queueActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  actionPill: {
    width: 40,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillActive: {
    backgroundColor: '#FFFFFF',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearBtnText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  undoToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  undoText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  undoButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  undoButtonText: {
    color: '#0A84FF',
    fontSize: 13,
    fontWeight: '700',
  },
  queueSectionHeader: {
    paddingVertical: 6,
  },
  queueSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  queueListContent: {
    paddingBottom: 16,
  },
  queueItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  queueItemRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  queueItemArt: {
    borderRadius: 6,
  },
  queueItemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  queueItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  queueItemArtist: {
    fontSize: 12,
    color: '#9E9EA4',
    marginTop: 2,
  },
  queueItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 4,
  },
  queueControlBtn: {
    padding: 6,
  },
  emptyQueueBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyQueueText: {
    color: '#71717A',
    fontSize: 13,
  },
  bottomControlsArea: {
    width: '100%',
    paddingTop: 8,
  },
  scrubberContainer: {
    width: '100%',
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 30,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginVertical: 4,
  },
  controlSubBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largePlayBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  volumeSlider: {
    flex: 1,
    marginHorizontal: 10,
    height: 24,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingTop: 8,
  },
  actionBtn: {
    width: 44,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: {
    backgroundColor: '#FFFFFF',
  },
});
