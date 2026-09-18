import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../theme/useTheme';

export const TrackSkeleton = () => {
  const { colors, spacing, radius } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { padding: spacing.md }]}>
      <Animated.View style={[styles.artwork, { backgroundColor: colors.border, borderRadius: radius.sm, opacity }]} />
      <View style={[styles.infoContainer, { marginLeft: spacing.md }]}>
        <Animated.View style={[styles.titleLine, { backgroundColor: colors.border, borderRadius: radius.sm, opacity }]} />
        <Animated.View style={[styles.artistLine, { backgroundColor: colors.border, borderRadius: radius.sm, opacity }]} />
      </View>
      <Animated.View style={[styles.icon, { backgroundColor: colors.border, borderRadius: radius.round, opacity }]} />
    </View>
  );
};

export const TrackListSkeleton = ({ count = 8 }: { count?: number }) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <TrackSkeleton key={`skeleton-${i}`} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artwork: {
    width: 48,
    height: 48,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleLine: {
    width: '70%',
    height: 16,
    marginBottom: 8,
  },
  artistLine: {
    width: '40%',
    height: 12,
  },
  icon: {
    width: 24,
    height: 24,
    marginLeft: 16,
  }
});
