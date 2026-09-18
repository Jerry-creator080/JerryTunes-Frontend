import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { TrackRow } from '../components/TrackRow';
import { useAudio } from '../context/AudioContext';
import { useLibrary } from '../context/LibraryContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { EmptyState } from '../components/EmptyState';

export const PlaylistDetailScreen = ({ route, navigation }: any) => {
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const { playlistId } = route.params;
  const { colors, spacing, typography } = useTheme();
  const { playTrack } = useAudio();
  const { playlists, removeTrackFromPlaylist } = useLibrary();
  const insets = useSafeAreaInsets();

  const playlist = playlists.find(p => p.id === playlistId);

  if (!playlist) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Playlist not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{playlist.name}</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={playlist.tracks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TrackRow 
                title={item.title || "Unknown"} 
                artist={item.artist || "Unknown"} 
                artworkUrl={item.artworkUrl} 
                onPress={() => playTrack(item, { source: 'playlist', id: playlist.id, tracks: playlist.tracks })} 
                onOptionsPress={() => setSelectedTrack(item)}
                onArtistPress={() => navigation.navigate('Artist', { artistName: item.artist, channelId: item.channelId })}
              />
            </View>
            <TouchableOpacity 
              style={{ padding: 16 }} 
              onPress={() => removeTrackFromPlaylist(playlist.id, item.id)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        ListEmptyComponent={
          <EmptyState 
            icon="musical-notes-outline" 
            title="Playlist is empty" 
            subtitle="Add some songs to this playlist to get started." 
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
