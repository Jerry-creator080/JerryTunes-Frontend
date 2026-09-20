import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { API_URL, fetchWithTimeout } from '../config/api';

const searchCache = new Map<string, any[]>();


export const SearchScreen = () => {
  const { colors, spacing } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { playTrack } = useAudio();
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem('@JerryTunes_search_history');
        if (stored) {
          setSearchHistory(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load search history", e);
      }
    };
    loadHistory();
  }, []);

  const addToHistory = async (query: string) => {
    try {
      const filtered = searchHistory.filter(q => q.toLowerCase() !== query.toLowerCase());
      const newHistory = [query, ...filtered].slice(0, 15);
      setSearchHistory(newHistory);
      await AsyncStorage.setItem('@JerryTunes_search_history', JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save search history", e);
    }
  };

  const clearHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem('@JerryTunes_search_history');
    } catch (e) {
      console.error("Failed to clear search history", e);
    }
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const runDiagnostics = async () => {
      console.log(`\n==================================================`);
      console.log(`[DIAGNOSTICS] STARTING EXPO GO NETWORK TESTS`);
      
      const healthUrl = `${API_URL}/api/health`;
      const searchUrl = `${API_URL}/api/search?q=test`;
      
      console.log(`[DIAGNOSTICS] 1. Testing plain fetch to Health: ${healthUrl}`);
      try {
        const startA = Date.now();
        const resA = await fetch(healthUrl);
        const textA = await resA.text();
        console.log(`[DIAGNOSTICS] Health SUCCESS. Status: ${resA.status}, Time: ${Date.now() - startA}ms`);
        console.log(`[DIAGNOSTICS] Health Body: ${textA}`);
      } catch (e: any) {
        console.error(`[DIAGNOSTICS] Health FAILED. Error: ${e.message}`);
        console.error(e);
      }

      console.log(`\n[DIAGNOSTICS] 2. Testing plain fetch to Search: ${searchUrl}`);
      try {
        const startB = Date.now();
        const resB = await fetch(searchUrl);
        console.log(`[DIAGNOSTICS] Search SUCCESS. Status: ${resB.status}, Time: ${Date.now() - startB}ms`);
      } catch (e: any) {
        console.error(`[DIAGNOSTICS] Search FAILED. Error: ${e.message}`);
        console.error(e);
      }
      console.log(`==================================================\n`);
    };

    runDiagnostics();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const trimmedQuery = searchQuery.trim();

    // Check cache first for instant UI response
    if (searchCache.has(trimmedQuery)) {
      setResults(searchCache.get(trimmedQuery)!);
      setError(null);
    } else {
      // Only show full skeleton if we have no prior results
      if (results.length === 0) setLoading(true);
    }

    const timer = setTimeout(() => {
      performSearch(trimmedQuery);
    }, 300); // 300ms debounce for snappier feel

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = Math.random().toString(36).substring(7);
    const startTimestamp = Date.now();

    setLoading(true);
    setError(null);
    
    const searchEndpoint = `${API_URL}/api/search?q=${encodeURIComponent(query)}`;
    
    console.log(`\n==================================================`);
    console.log(`[FORENSICS] SEARCH START`);
    console.log(`- Query: "${query}"`);
    console.log(`- Exact API URL: ${searchEndpoint}`);
    console.log(`- Request ID: ${requestId}`);
    console.log(`- Timestamp: ${new Date(startTimestamp).toISOString()}`);

    try {
      const response = await fetchWithTimeout(searchEndpoint, { signal: controller.signal });
      const elapsed = Date.now() - startTimestamp;
      
      console.log(`\n[FORENSICS] SEARCH RESPONSE`);
      console.log(`- HTTP Status: ${response.status}`);
      console.log(`- Elapsed: ${elapsed}ms`);

      if (response.ok) {
        const text = await response.text();
        console.log(`- Response Size: ${text.length} bytes`);
        const data = JSON.parse(text);

        if (!controller.signal.aborted) {
          searchCache.set(query, data);
          if (searchCache.size > 20) {
            const firstKey = searchCache.keys().next().value;
            if (firstKey) searchCache.delete(firstKey);
          }
          setResults(data);
          setError(null);
          addToHistory(query);
        }
      } else {
        if (!controller.signal.aborted) {
          console.error(`\n[FORENSICS] SEARCH ERROR (HTTP ${response.status})`);
          console.error(`- Request URL: ${searchEndpoint}`);
          console.error(`- Request ID: ${requestId}`);
          
          const errorText = await response.text();
          console.error(`- Error Body: ${errorText}`);
          
          setError(`HTTP ${response.status}: ${errorText}`);
        }
      }
    } catch (e: any) {
      if (!controller.signal.aborted) {
        console.error(`\n[FORENSICS] SEARCH ERROR`);
        console.error(`- Request URL: ${searchEndpoint}`);
        console.error(`- Request ID: ${requestId}`);
        console.error(`- Error Name: ${e.name}`);
        console.error(`- Error Message: ${e.message}`);
        if (e.code) console.error(`- Error Code: ${e.code}`);
        if (e.cause) console.error(`- Error Cause: ${e.cause}`);
        
        setError(`Raw Error: ${e.name} - ${e.message}`);
      } else {
        console.log(`\n[FORENSICS] SEARCH CANCELLED (Stale Request) - ${requestId}`);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={{ padding: spacing.md }}>
        <SearchField value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <View style={styles.content}>
        {!searchQuery.trim() ? (
          <View style={{ flex: 1, padding: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Recent Searches</Text>
              {searchHistory.length > 0 && (
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={{ color: colors.primary, fontSize: 14 }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            {searchHistory.length === 0 ? (
              <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>No recent searches</Text>
            ) : (
              <FlatList
                data={searchHistory}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={{ paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                    onPress={() => setSearchQuery(item)}
                  >
                    <Text style={{ color: colors.text, fontSize: 16 }}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        ) : loading && results.length === 0 ? (
          <TrackListSkeleton count={10} />
        ) : error && results.length === 0 ? (
          <ErrorState message={error} onRetry={() => performSearch(searchQuery.trim())} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              loading && results.length > 0 ? (
                <View style={{ padding: spacing.md, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
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
              ) : null
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
