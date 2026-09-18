import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { TrackRow } from '../components/TrackRow';
import { SectionHeader } from '../components/SectionHeader';
import { useAudio } from '../context/AudioContext';
import { useLibrary } from '../context/LibraryContext';
import { useOffline } from '../context/OfflineContext';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { EmptyState } from '../components/EmptyState';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const LibraryScreen = () => {
  const { colors, spacing, typography } = useTheme();
  const { playTrack } = useAudio();
  const { favorites, playlists, createPlaylist, deletePlaylist } = useLibrary();
  const { downloadTrack, offlineTracks } = useOffline();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'favorites' | 'playlists' | 'downloads'>('favorites');


  const handleCreatePlaylist = () => {
    if (typeof window !== 'undefined') {
      const name = window.prompt("Playlist Name:");
      if (name) createPlaylist(name);
    } else {
      Alert.prompt("New Playlist", "Enter playlist name", (name) => {
        if (name) createPlaylist(name);
      });
    }
  };

  const renderTabs = () => (
    <View style={[styles.tabContainer, { borderColor: colors.border }]}>
      {(['favorites', 'playlists', 'downloads'] as const).map(tab => (
        <TouchableOpacity 
          key={tab} 
          style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPlaylists = () => (
    <FlatList
      data={playlists}
      keyExtractor={p => p.id}
      ListHeaderComponent={
        <TouchableOpacity style={[styles.createPlaylist, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleCreatePlaylist}>
          <Ionicons name="add" size={24} color={colors.primary} />
          <Text style={{ color: colors.text, marginLeft: spacing.md, fontWeight: '600' }}>Create New Playlist</Text>
        </TouchableOpacity>
      }
      ListEmptyComponent={
        <EmptyState 
          icon="albums-outline" 
          title="No playlists yet" 
          subtitle="Create your first playlist to organize your music." 
        />
      }
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={[styles.playlistRow, { borderBottomColor: colors.border }]} 
          onPress={() => (navigation as any).navigate('PlaylistDetail', { playlistId: item.id })}
          onLongPress={() => deletePlaylist(item.id)}
        >
          <View style={[styles.playlistIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="musical-notes" size={24} color={colors.textSecondary} />
          </View>
          <View>
            <Text style={{ color: colors.text, fontSize: typography.sizes.md, fontWeight: '600' }}>{item.name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>{item.tracks.length} tracks</Text>
          </View>
        </TouchableOpacity>
      )}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
    />
  );

  const renderTracks = (data: any[], emptyMsg: string) => (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TrackRow 
          title={item.title || "Unknown"} 
          artist={item.artist || "Unknown"} 
          artworkUrl={item.artworkUrl} 
          onPress={() => playTrack(item, { source: activeTab as any, tracks: data })} 
          onOptionsPress={() => setSelectedTrack(item)}
          onArtistPress={() => (navigation as any).navigate('Artist', { artistName: item.artist, channelId: item.channelId })}
        />
      )}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      ListEmptyComponent={
        <EmptyState 
          icon="library-outline" 
          title="No tracks here" 
          subtitle={emptyMsg} 
        />
      }
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionHeader title="Library" />
      {renderTabs()}
      
      {activeTab === 'favorites' && renderTracks(favorites, "Your favorites list is empty.")}
      {activeTab === 'downloads' && renderTracks(favorites.filter(f => offlineTracks.some(o => o.id === f.id)), "No downloaded tracks found in favorites.")}
      {activeTab === 'playlists' && renderPlaylists()}

      <TrackOptionsSheet 
        track={selectedTrack}
        onClose={() => setSelectedTrack(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontWeight: '600',
    fontSize: 14,
  },
  createPlaylist: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  }
});
