import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { TrackRow } from '../components/TrackRow';
import { useAudio } from '../context/AudioContext';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { TrackListSkeleton } from '../components/SkeletonLoader';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ArtistScreen = ({ route, navigation }: any) => {
  const { artistName, channelId } = route.params;
  const { colors, spacing, typography, radius } = useTheme();
  const { playTrack } = useAudio();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<'videos' | 'playlists'>('videos');
  const [videos, setVideos] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: 'videos' | 'playlists') => {
    if (tab === 'videos' && videos.length > 0 && !error) return;
    if (tab === 'playlists' && playlists.length > 0 && !error) return;

    setLoading(true);
    setError(null);
    try {
      const { API_URL } = require('../config/api');
      const endpoint = tab === 'videos' ? '/api/search' : '/api/search/playlists';
      const response = await fetch(`${API_URL}${endpoint}?q=${encodeURIComponent(artistName)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (tab === 'videos') setVideos(data);
        if (tab === 'playlists') setPlaylists(data);
      } else {
        setError("Failed to fetch artist details.");
      }
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistPress = (playlist: any) => {
    // Currently PlaylistDetailScreen expects a local playlist ID. 
    // We would need a generic playlist screen for remote playlists.
    // For now, let's create a temporary playlist object and navigate.
    alert("Viewing remote playlists is coming in the next update!");
  };

  const renderTabs = () => (
    <View style={[styles.tabContainer, { borderColor: colors.border }]}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'videos' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        onPress={() => setActiveTab('videos')}
      >
        <Text style={[styles.tabText, { color: activeTab === 'videos' ? colors.primary : colors.textSecondary }]}>VIDEOS</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'playlists' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        onPress={() => setActiveTab('playlists')}
      >
        <Text style={[styles.tabText, { color: activeTab === 'playlists' ? colors.primary : colors.textSecondary }]}>PLAYLISTS</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{artistName}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.artistHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="person" size={40} color={colors.textSecondary} />
        </View>
        <Text style={{ color: colors.text, fontSize: typography.sizes.xl, fontWeight: '700', marginTop: spacing.md }}>{artistName}</Text>
      </View>

      {renderTabs()}

      {loading ? (
        <TrackListSkeleton count={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchData(activeTab)} />
      ) : activeTab === 'videos' ? (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TrackRow 
              title={item.title} 
              artist={item.artist} 
              artworkUrl={item.artworkUrl} 
              onPress={() => playTrack(item, { source: 'search', tracks: videos })} 
              onOptionsPress={() => setSelectedTrack(item)}
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          ListEmptyComponent={
            <EmptyState 
              icon="videocam-outline" 
              title="No videos found" 
              subtitle="This artist doesn't have any videos available." 
            />
          }
        />
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.playlistRow, { borderBottomColor: colors.border }]} 
              onPress={() => handlePlaylistPress(item)}
            >
              <View style={[styles.playlistIcon, { backgroundColor: colors.surface, borderRadius: radius.sm }]}>
                <Ionicons name="albums" size={24} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: typography.sizes.md, fontWeight: '600' }} numberOfLines={1}>{item.title}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>{item.videoCount} videos</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          ListEmptyComponent={
            <EmptyState 
              icon="albums-outline" 
              title="No playlists found" 
              subtitle="This channel doesn't have any playlists." 
            />
          }
        />
      )}

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
    flex: 1,
    textAlign: 'center',
  },
  artistHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  }
});
