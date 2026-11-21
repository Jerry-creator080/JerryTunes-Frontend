import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  PanResponder,
  Platform 
} from 'react-native';
import { useAudio } from '../context/AudioContext';
import { useAudioPlayerStatus } from 'expo-audio';
import { Artwork } from './Artwork';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

interface MiniPlayerProps {
  navigationRef?: any;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ navigationRef }) => {
  const { currentTrack, pause, resume, player, isResolving, next, previous } = useAudio();
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { getGlassStyle, isDark } = useTheme();

  // Swipe animation values
  const panX = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  // Buffering ring spin animation
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isResolving) {
      loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        })
      );
      loop.start();
    } else {
      spinAnim.setValue(0);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isResolving, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // PanResponder to handle horizontal swipe gestures on MiniPlayer
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        const limit = 80;
        const dx = gestureState.dx;
        const damped = Math.abs(dx) < limit 
          ? dx 
          : (dx > 0 ? 1 : -1) * (limit + (Math.abs(dx) - limit) * 0.3);
        panX.setValue(damped);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 55;
        if (gestureState.dx < -threshold) {
          // Swipe Left -> Skip to Next
          Animated.timing(panX, {
            toValue: -200,
            duration: 140,
            useNativeDriver: true,
          }).start(() => {
            next();
            panX.setValue(120);
            Animated.spring(panX, {
              toValue: 0,
              tension: 80,
              friction: 9,
              useNativeDriver: true,
            }).start();
          });
        } else if (gestureState.dx > threshold) {
          // Swipe Right -> Skip to Previous
          Animated.timing(panX, {
            toValue: 200,
            duration: 140,
            useNativeDriver: true,
          }).start(() => {
            previous();
            panX.setValue(-120);
            Animated.spring(panX, {
              toValue: 0,
              tension: 80,
              friction: 9,
              useNativeDriver: true,
            }).start();
          });
        } else {
          // Spring back to center
          Animated.spring(panX, {
            toValue: 0,
            tension: 90,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!currentTrack) return null;

  const handleOpenNowPlaying = () => {
    if (navigationRef && navigationRef.isReady && navigationRef.isReady()) {
      navigationRef.navigate('NowPlaying');
    } else {
      try {
        navigation.navigate('NowPlaying');
      } catch (e) {
        // Fallback
      }
    }
  };

  // Tab bar height is 52 + insets.bottom; float 8px above it
  const bottomOffset = 52 + (insets.bottom > 0 ? insets.bottom : 6) + 8;
  const glass = getGlassStyle('bar');

  return (
    <View
      style={[
        styles.floatingCard,
        {
          bottom: bottomOffset,
          backgroundColor: glass.backgroundColor,
          borderColor: glass.borderColor,
          borderWidth: glass.borderWidth,
          shadowColor: glass.shadowColor,
          shadowOffset: glass.shadowOffset,
          shadowOpacity: glass.shadowOpacity,
          shadowRadius: glass.shadowRadius,
          elevation: glass.elevation,
        }
      ]}
    >
      {/* Draggable Music Info Area */}
      <View 
        style={styles.touchArea} 
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.innerRow}
          activeOpacity={0.9}
          onPress={handleOpenNowPlaying}
        >
          <Animated.View 
            style={[
              styles.slidingContent,
              {
                transform: [{ translateX: panX }],
                opacity: contentOpacity,
              }
            ]}
          >
            <Artwork
              key={currentTrack.id}
              url={currentTrack.artworkUrl}
              size={42}
              style={styles.artwork}
            />

            <View style={styles.info}>
              <Text 
                style={[styles.title, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]} 
                numberOfLines={1}
              >
                {currentTrack.title}
              </Text>
              <Text 
                style={[styles.artist, { color: isDark ? '#A1A1AA' : '#636366' }]} 
                numberOfLines={1}
              >
                {isResolving ? 'Buffering audio...' : currentTrack.artist}
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* 3-Button Controls Row: Previous + Play/Pause + Next */}
      <View style={styles.controls}>
        {/* Previous Track Button */}
        <TouchableOpacity
          onPress={() => previous()}
          style={styles.iconButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        >
          <Ionicons
            name="play-back"
            size={18}
            color={isDark ? '#FFFFFF' : '#1C1C1E'}
          />
        </TouchableOpacity>

        {/* Buffering Ring & Play/Pause Button */}
        <TouchableOpacity
          onPress={() => {
            if (isPlaying) pause();
            else resume();
          }}
          style={styles.playPauseBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        >
          {isResolving && (
            <Animated.View style={[styles.bufferingRing, { transform: [{ rotate: spin }] }]} />
          )}
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={isResolving ? 16 : 21}
            color={isDark ? '#FFFFFF' : '#1C1C1E'}
            style={{ marginLeft: isPlaying ? 0 : 2 }}
          />
        </TouchableOpacity>

        {/* Next Track Button */}
        <TouchableOpacity
          onPress={() => next()}
          style={styles.iconButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        >
          <Ionicons
            name="play-forward"
            size={18}
            color={isDark ? '#FFFFFF' : '#1C1C1E'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 6,
    zIndex: 9999,
    overflow: 'hidden',
  },
  touchArea: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  innerRow: {
    flex: 1,
    justifyContent: 'center',
  },
  slidingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  artwork: {
    borderRadius: 9,
  },
  info: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  artist: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 4,
  },
  playPauseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bufferingRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: '#0A84FF',
    borderRightColor: '#FFFFFF',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
