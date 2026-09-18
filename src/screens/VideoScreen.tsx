import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { VideoView } from 'expo-video';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../theme/useTheme';
import { IconButton } from '../components/IconButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const VideoScreen = ({ route, navigation }: any) => {
  const { track } = route.params;
  const { player, currentTrack, playTrack } = useAudio();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // If the requested track is not the one currently playing, play it via the global engine
    if (track.id !== currentTrack?.id) {
      playTrack(track);
    }
  }, [track.id]);

  return (
    <View style={[styles.container, { backgroundColor: '#000', paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton name="close" size={28} color="#fff" onPress={() => navigation.goBack()} />
        <Text style={[styles.title, { fontSize: typography.sizes.sm }]} numberOfLines={1}>
          {track.title}
        </Text>
        <View style={{ width: 28 }} />
      </View>
      
      <View style={styles.content}>
        {!player && <ActivityIndicator size="large" color={colors.primary} />}
        {player && (
          <VideoView 
            player={player as any} 
            style={styles.video} 
          />
        )}
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
    paddingHorizontal: 16,
    height: 50,
    zIndex: 10,
  },
  title: {
    color: '#fff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
