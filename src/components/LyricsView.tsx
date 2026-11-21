import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL, fetchWithTimeout } from '../config/api';
import { useTheme } from '../theme/useTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LyricLine {
  timeMs: number;
  text: string;
}

interface LyricsViewProps {
  title: string;
  artist: string;
  duration?: number;
  currentTimeMs: number;
  onSeek?: (timeMs: number) => void;
}

const parseLrc = (lrcString: string): LyricLine[] => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const result: LyricLine[] = [];

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    const text = line.replace(timeRegex, '').trim();

    if (matches.length > 0 && text.length > 0) {
      for (const match of matches) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const fraction = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
        const timeMs = min * 60000 + sec * 1000 + fraction;
        result.push({ timeMs, text });
      }
    }
  }

  return result.sort((a, b) => a.timeMs - b.timeMs);
};

export const LyricsView: React.FC<LyricsViewProps> = ({
  title,
  artist,
  duration,
  currentTimeMs,
  onSeek,
}) => {
  const { colors, getGlassStyle, themeStyle } = useTheme();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isFollowing, setIsFollowing] = useState<boolean>(true);
  const [containerHeight, setContainerHeight] = useState<number>(SCREEN_HEIGHT * 0.55);

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const lineLayouts = useRef<{ [key: number]: { y: number; height: number } }>({});
  const hasInitiallyScrolled = useRef<boolean>(false);

  // Fetch lyrics whenever title or artist changes
  useEffect(() => {
    let isCancelled = false;
    hasInitiallyScrolled.current = false;
    lineLayouts.current = {};

    const fetchLyrics = async () => {
      setLoading(true);
      setError(null);
      setLyrics([]);
      setPlainLyrics(null);
      setActiveIndex(-1);
      setIsFollowing(true);

      try {
        const durationSec = duration ? Math.floor(duration / 1000) : undefined;
        const query = new URLSearchParams({
          title,
          artist: artist || '',
          ...(durationSec ? { duration: String(durationSec) } : {})
        });

        const res = await fetchWithTimeout(`${API_URL}/api/lyrics?${query.toString()}`, { timeout: 8000 });
        if (!res.ok) {
          throw new Error('Lyrics not available');
        }

        const data = await res.json();
        if (isCancelled) return;

        if (data.syncedLyrics) {
          const parsed = parseLrc(data.syncedLyrics);
          setLyrics(parsed);
        } else if (data.plainLyrics) {
          setPlainLyrics(data.plainLyrics);
        } else {
          setError('No lyrics available for this track');
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError('Could not load lyrics for this track');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchLyrics();

    return () => {
      isCancelled = true;
    };
  }, [title, artist, duration]);

  // Center target calculation with layout positions
  const scrollToLine = useCallback((index: number, animated = true) => {
    if (index < 0 || !scrollViewRef.current) return;
    const layout = lineLayouts.current[index];
    if (layout) {
      const targetY = Math.max(0, layout.y - containerHeight / 2 + layout.height / 2);
      scrollViewRef.current.scrollTo({ y: targetY, animated });
    }
  }, [containerHeight]);

  // Update active line based on playback timestamp
  useEffect(() => {
    if (lyrics.length === 0) return;

    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTimeMs >= lyrics[i].timeMs) {
        idx = i;
      } else {
        break;
      }
    }

    if (idx !== activeIndex) {
      setActiveIndex(idx);

      // Only auto-scroll if user is following
      if (isFollowing && idx >= 0) {
        // If first scroll after opening, jump smoothly
        scrollToLine(idx, hasInitiallyScrolled.current);
        hasInitiallyScrolled.current = true;
      }
    }
  }, [currentTimeMs, lyrics, activeIndex, isFollowing, scrollToLine]);

  const handleLinePress = (timeMs: number, index: number) => {
    setIsFollowing(true);
    if (onSeek) onSeek(timeMs);
    scrollToLine(index, true);
  };

  const handleManualScrollBegin = () => {
    setIsFollowing(false);
  };

  const handleFollowPress = () => {
    setIsFollowing(true);
    scrollToLine(activeIndex, true);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading synced lyrics...</Text>
      </View>
    );
  }

  if (error || (lyrics.length === 0 && !plainLyrics)) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="chatbox-ellipses-outline" size={42} color="rgba(255,255,255,0.3)" style={{ marginBottom: 12 }} />
        <Text style={styles.emptyText}>
          {error || 'No lyrics found for this song'}
        </Text>
      </View>
    );
  }

  // Plain text lyrics fallback
  if (plainLyrics && lyrics.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.plainLyricsText}>{plainLyrics}</Text>
      </ScrollView>
    );
  }

  const glassStyle = getGlassStyle('pill');

  return (
    <View 
      style={styles.wrapper}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={handleManualScrollBegin}
        scrollEventThrottle={32}
      >
        {/* Top spacer to allow centering top lines */}
        <View style={{ height: containerHeight * 0.35 }} />

        {lyrics.map((line, index) => {
          const isActive = index === activeIndex;

          return (
            <TouchableOpacity
              key={`${line.timeMs}-${index}`}
              activeOpacity={0.75}
              onPress={() => handleLinePress(line.timeMs, index)}
              onLayout={(e) => {
                lineLayouts.current[index] = {
                  y: e.nativeEvent.layout.y,
                  height: e.nativeEvent.layout.height,
                };
                // If this is the active line on initial layout, center it
                if (index === activeIndex && !hasInitiallyScrolled.current) {
                  scrollToLine(index, false);
                  hasInitiallyScrolled.current = true;
                }
              }}
              style={styles.lineTouch}
            >
              <Text
                style={[
                  styles.lyricLine,
                  isActive ? styles.activeLine : styles.inactiveLine,
                ]}
              >
                {line.text}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Bottom spacer to allow centering bottom lines */}
        <View style={{ height: containerHeight * 0.45 }} />
      </ScrollView>

      {/* Subtle Floating "Follow" Button */}
      {!isFollowing && activeIndex >= 0 && (
        <TouchableOpacity
          style={[
            styles.followButton,
            {
              backgroundColor: glassStyle.backgroundColor,
              borderColor: glassStyle.borderColor,
              borderWidth: glassStyle.borderWidth,
            }
          ]}
          onPress={handleFollowPress}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={14} color="#0A84FF" style={{ marginRight: 6 }} />
          <Text style={styles.followButtonText}>Follow Lyrics</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#A1A1AA',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    color: '#A1A1AA',
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  lineTouch: {
    marginVertical: 12,
  },
  lyricLine: {
    letterSpacing: -0.3,
  },
  activeLine: {
    fontSize: 27,
    fontWeight: '800',
    color: '#FFFFFF',
    opacity: 1.0,
    lineHeight: 36,
  },
  inactiveLine: {
    fontSize: 21,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.42)',
    lineHeight: 30,
  },
  plainLyricsText: {
    fontSize: 17,
    lineHeight: 28,
    color: '#FFFFFF',
    fontWeight: '500',
    paddingVertical: 20,
  },
  followButton: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
