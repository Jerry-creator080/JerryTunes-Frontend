import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { SearchField } from '../components/SearchField';
import { TrackRow } from '../components/TrackRow';
import { useAudio } from '../context/AudioContext';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { TrackListSkeleton } from '../components/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export const SearchScreen = () => {
  const { colors, spacing } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { playTrack } = useAudio();
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!searchQuery) {
      setResults([]);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 500); // debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const { API_URL } = require('../config/api');
      const searchEndpoint = `${API_URL}/api/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(searchEndpoint);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        console.error(`[Search Error] Bad response from ${searchEndpoint} - Status: ${response.status}`);
        setError("Failed to fetch search results.");
      }
    } catch (e: any) {
      console.error(`[Search Error] Network/Fetch failure:`, e.message || e);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={{ padding: spacing.md }}>
        <SearchField value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <TrackListSkeleton count={10} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => performSearch(searchQuery)} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TrackRow 
                title={item.title} 
                artist={item.artist} 
                artworkUrl={item.artworkUrl} 
                onPress={() => playTrack(item, { source: 'search', tracks: results })} 
                onOptionsPress={() => setSelectedTrack(item)}
                onArtistPress={() => navigation.navigate('Artist', { artistName: item.artist, channelId: item.channelId })}
              />
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            ListEmptyComponent={
              searchQuery.length > 0 && !loading ? (
                <EmptyState 
                  icon="search-outline" 
                  title="No results found" 
                  subtitle={`We couldn't find anything for "${searchQuery}". Try searching for something else.`} 
                />
              ) : (
                <EmptyState 
                  icon="musical-notes-outline" 
                  title="Search JerryTunes" 
                  subtitle="Find your favorite songs, artists, and playlists." 
                />
              )
            }
          />
        )}
      </View>
      
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
  },
  content: {
    flex: 1,
  }
});
