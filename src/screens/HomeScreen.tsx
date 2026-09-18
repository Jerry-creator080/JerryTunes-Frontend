import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { SectionHeader } from '../components/SectionHeader';
import { TrackRow } from '../components/TrackRow';
import { useAudio } from '../context/AudioContext';
import { useHistory } from '../context/HistoryContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { EmptyState } from '../components/EmptyState';

export const HomeScreen = ({ navigation }: any) => {
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const { colors, spacing, typography } = useTheme();
  const { playTrack } = useAudio();
  const { history } = useHistory();
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionHeader title="Recently Played" />
      <FlatList
        data={history}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => (
          <TrackRow 
            title={item.title} 
            artist={item.artist} 
            artworkUrl={item.artworkUrl} 
            onPress={() => playTrack(item, { source: 'recently_played', tracks: history })} 
            onOptionsPress={() => setSelectedTrack(item)}
            onArtistPress={() => navigation.navigate('Artist', { artistName: item.artist, channelId: item.channelId })}
          />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        ListEmptyComponent={
          <EmptyState 
            icon="time-outline" 
            title="No recently played tracks" 
            subtitle="Search for your favorite music and start listening!" 
          />
        }
      />
      <TrackOptionsSheet 
        track={selectedTrack}
        onClose={() => setSelectedTrack(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
