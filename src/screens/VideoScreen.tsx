import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  Animated, 
  ScrollView 
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudio } from '../context/AudioContext';
import { useOffline } from '../context/OfflineContext';
import { useLibrary } from '../context/LibraryContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { API_URL, fetchWithTimeout } from '../config/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = (SCREEN_WIDTH * 9) / 16;

export const VideoScreen = ({ route, navigation }: any) => {
  const { track } = route.params;
  const { pause: pauseAudio } = useAudio();
  const { downloadTrack, isDownloaded } = useOffline();
  const { isFavorite, toggleFavorite } = useLibrary();
  const insets = useSafeAreaInsets();

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  // UI state
  const [showsControls, setShowsControls] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [is2xBoosting, setIs2xBoosting] = useState(false);
  const [skipBadge, setSkipBadge] = useState<{ side: 'left' | 'right'; seconds: number } | null>(null);

  // Gesture tracking refs
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const controlsTimeoutRef = useRef<any>(null);
  const skipBadgeTimeoutRef = useRef<any>(null);
  const holdTimerRef = useRef<any>(null);

  // Pause background audio when video opens
  useEffect(() => {
    pauseAudio();
  }, []);

  // Fetch direct video stream
  useEffect(() => {
    let isCancelled = false;

    const resolveStream = async () => {
      setLoadingStream(true);
      setStreamError(null);
      try {
        const res = await fetchWithTimeout(`${API_URL}/api/stream?id=${track.id}`, { timeout: 10000 });
        if (!res.ok) throw new Error('Failed to resolve video stream');
        const data = await res.json();
        if (isCancelled) return;

        if (data.videoUrl) {
          setVideoUrl(data.videoUrl);
        } else if (data.audioUrl) {
          setVideoUrl(data.audioUrl);
        } else {
          setStreamError('No valid stream format found');
        }
      } catch (err: any) {
        if (!isCancelled) setStreamError(err.message || 'Error loading video');
      } finally {
        if (!isCancelled) setLoadingStream(false);
      }
    };

    resolveStream();

    return () => {
      isCancelled = true;
    };
  }, [track.id]);

  // expo-video player instance
  const videoPlayer = useVideoPlayer(videoUrl || '', player => {
    player.loop = false;
    player.play();
  });

  // Auto-hide overlay controls after 3 seconds of active playback
  const resetControlsTimer = () => {
    setShowsControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoPlayer.playing && !isScrubbing) {
        setShowsControls(false);
      }
    }, 3200);
  };

  const handleTap = (e: any) => {
    const tapX = e.nativeEvent.locationX;
    const now = Date.now();
    const timeDelta = now - lastTapRef.current.time;
    const distanceDelta = Math.abs(tapX - lastTapRef.current.x);

    // Double-tap threshold
    if (timeDelta < 320 && distanceDelta < 80) {
      if (tapX < SCREEN_WIDTH * 0.4) {
        // Double-tap Left -> -10s
        videoPlayer.seekBy(-10);
        triggerSkipBadge('left', -10);
      } else if (tapX > SCREEN_WIDTH * 0.6) {
        // Double-tap Right -> +10s
        videoPlayer.seekBy(10);
        triggerSkipBadge('right', 10);
      } else {
        // Center double tap -> toggle play/pause
        if (videoPlayer.playing) videoPlayer.pause();
        else videoPlayer.play();
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: tapX };
      resetControlsTimer();
    }
  };

  const triggerSkipBadge = (side: 'left' | 'right', seconds: number) => {
    if (skipBadgeTimeoutRef.current) clearTimeout(skipBadgeTimeoutRef.current);
    setSkipBadge({ side, seconds });
    skipBadgeTimeoutRef.current = setTimeout(() => {
      setSkipBadge(null);
    }, 850);
  };

  // Touch and hold for 2X Speed Boost
  const handlePressIn = () => {
    holdTimerRef.current = setTimeout(() => {
      if (videoPlayer) {
        videoPlayer.playbackRate = 2.0;
        setIs2xBoosting(true);
      }
    }, 420);
  };

  const handlePressOut = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (is2xBoosting) {
      if (videoPlayer) videoPlayer.playbackRate = 1.0;
      setIs2xBoosting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const total = Math.floor(Math.max(0, seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isFav = isFavorite(track.id);
  const isDown = isDownloaded(track.id);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 16:9 Video Player Viewport */}
      <View style={styles.videoViewport}>
        {videoUrl ? (
          <VideoView
            player={videoPlayer}
            style={styles.videoView}
            nativeControls={false}
            contentFit="contain"
          />
        ) : loadingStream ? (
          <View style={styles.centerViewport}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.viewportMsg}>Resolving stream...</Text>
          </View>
        ) : (
          <View style={styles.centerViewport}>
            <Ionicons name="alert-circle-outline" size={32} color="#FF453A" />
            <Text style={styles.viewportMsg}>{streamError || 'Video unplayable'}</Text>
          </View>
        )}

        {/* 2X Speed Active Badge */}
        {is2xBoosting && (
          <View style={styles.boostBadge}>
            <Ionicons name="flash" size={16} color="#FFD60A" style={{ marginRight: 4 }} />
            <Text style={styles.boostBadgeText}>2X Speed</Text>
          </View>
        )}

        {/* Double-tap Skip Indicator */}
        {skipBadge && (
          <View style={[styles.skipBadgeBox, skipBadge.side === 'left' ? styles.skipLeft : styles.skipRight]}>
            <Ionicons
              name={skipBadge.side === 'left' ? 'play-back' : 'play-forward'}
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.skipBadgeText}>{skipBadge.seconds > 0 ? `+${skipBadge.seconds}s` : `${skipBadge.seconds}s`}</Text>
          </View>
        )}

        {/* Transparent Touch & Gesture Capture Layer */}
        <TouchableOpacity
          style={styles.gestureOverlay}
          activeOpacity={1}
          onPress={handleTap}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {/* Overlaid Player Controls (Fade in/out) */}
          {showsControls && (
            <View style={styles.controlsLayer}>
              {/* Top Controls Row */}
              <View style={styles.topRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleBtn}>
                  <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity 
                  onPress={() => {
                    if (videoPlayer.muted) videoPlayer.muted = false;
                    else videoPlayer.muted = true;
                  }} 
                  style={styles.circleBtn}
                >
                  <Ionicons name={videoPlayer.muted ? "volume-mute" : "volume-high"} size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Center Play/Pause & Skip Buttons */}
              <View style={styles.centerButtonsRow}>
                <TouchableOpacity onPress={() => videoPlayer.seekBy(-10)} style={styles.subSkipBtn}>
                  <Ionicons name="play-back" size={26} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (videoPlayer.playing) videoPlayer.pause();
                    else videoPlayer.play();
                    resetControlsTimer();
                  }}
                  style={styles.mainPlayBtn}
                >
                  <Ionicons
                    name={videoPlayer.playing ? 'pause' : 'play'}
                    size={32}
                    color="#000000"
                  />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => videoPlayer.seekBy(10)} style={styles.subSkipBtn}>
                  <Ionicons name="play-forward" size={26} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Bottom Scrubber & Time */}
              <View style={styles.bottomScrubberRow}>
                <Text style={styles.timeText}>{formatTime(isScrubbing ? scrubValue : videoPlayer.currentTime)}</Text>
                <Slider
                  style={styles.scrubberSlider}
                  minimumValue={0}
                  maximumValue={videoPlayer.duration || 1}
                  value={isScrubbing ? scrubValue : videoPlayer.currentTime}
                  onValueChange={val => {
                    setIsScrubbing(true);
                    setScrubValue(val);
                  }}
                  onSlidingComplete={val => {
                    videoPlayer.currentTime = val;
                    setIsScrubbing(false);
                    resetControlsTimer();
                  }}
                  minimumTrackTintColor="#FF0000"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#FF0000"
                />
                <Text style={styles.timeText}>{formatTime(videoPlayer.duration)}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Video Details & Actions */}
      <ScrollView 
        style={styles.detailsScroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.videoTitle}>{track.title}</Text>
        <Text style={styles.videoStats}>YouTube • High Definition • {track.duration || 'Video'}</Text>

        {/* Action Pills Row */}
        <View style={styles.actionPillsRow}>
          <TouchableOpacity 
            style={[styles.pill, isFav && styles.pillActive]} 
            onPress={() => toggleFavorite(track)}
          >
            <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? "#FF3B30" : "#FFFFFF"} />
            <Text style={[styles.pillText, isFav && { color: "#FF3B30" }]}>{isFav ? 'Liked' : 'Like'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.pill, isDown && styles.pillActive]} 
            onPress={() => downloadTrack(track, 'mp4_720')}
          >
            <Ionicons name={isDown ? "checkmark-circle" : "arrow-down-circle-outline"} size={18} color="#FFFFFF" />
            <Text style={styles.pillText}>{isDown ? 'Downloaded' : 'Download'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pill} onPress={() => {}}>
            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
            <Text style={styles.pillText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Channel Info Card */}
        <View style={styles.channelCard}>
          <View style={styles.channelAvatar}>
            <Ionicons name="person" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.channelInfo}>
            <Text style={styles.channelName} numberOfLines={1}>{track.artist || 'Creator Channel'}</Text>
            <Text style={styles.channelSubs}>Official Artist • YouTube</Text>
          </View>
          <TouchableOpacity style={styles.subscribeBtn}>
            <Text style={styles.subscribeText}>Subscribed</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  videoViewport: {
    width: SCREEN_WIDTH,
    height: VIDEO_HEIGHT,
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoView: {
    width: '100%',
    height: '100%',
  },
  centerViewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewportMsg: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 8,
  },
  gestureOverlay: {
    ...StyleSheet.absoluteFill,
  },
  controlsLayer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'space-between',
    padding: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  subSkipBtn: {
    padding: 8,
  },
  mainPlayBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomScrubberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrubberSlider: {
    flex: 1,
    marginHorizontal: 8,
    height: 30,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  boostBadge: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#FFD60A',
    zIndex: 99,
  },
  boostBadgeText: {
    color: '#FFD60A',
    fontSize: 12,
    fontWeight: '700',
  },
  skipBadgeBox: {
    position: 'absolute',
    top: '36%',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 98,
  },
  skipLeft: {
    left: 24,
  },
  skipRight: {
    right: 24,
  },
  skipBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  detailsScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  videoStats: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
  },
  actionPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  pillActive: {
    backgroundColor: '#3F3F46',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 12,
    marginTop: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  channelAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  channelName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  channelSubs: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  subscribeBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  subscribeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
