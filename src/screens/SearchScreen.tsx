import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Image, 
  Dimensions, 
  Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudio } from '../context/AudioContext';
import { useOffline } from '../context/OfflineContext';
import { useHistory } from '../context/HistoryContext';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { Artwork } from '../components/Artwork';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL, fetchWithTimeout } from '../config/api';

const { width } = Dimensions.get('window');
const TILE_WIDTH = (width - 44) / 2;

const GENRE_TILES = [
  { id: 'g1', title: 'New releases', bg: '#4A148C' },
  { id: 'g2', title: 'Charts', bg: '#311B92' },
  { id: 'g3', title: 'Moods & genres', bg: '#880E4F' },
  { id: 'g4', title: 'Chill', bg: '#4A154B' },
  { id: 'g5', title: 'Commute', bg: '#BF360C' },
  { id: 'g6', title: 'Energize', bg: '#C2185B' },
];

const TRENDING_SUGGESTIONS = [
  'Kaavish',
  'The Weeknd',
  'Taylor Swift',
  'Arijit Singh',
  'Coldplay',
  'Drake',
  'Talha Anjum',
  'Coke Studio'
];

export const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [matchedAlbums, setMatchedAlbums] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Songs' | 'Albums' | 'Artists' | 'Playlists'>('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([
    'Teo palm trees',
    'harry hudson',
    'Gta vi songs',
    'tairay naam kaavish',
    'Ahmed aamir raahi'
  ]);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);

  const { playTrack, currentTrack, player, pause, resume } = useAudio();
  const { isOfflineOnly, offlineTracks, downloadedAlbums, offlineMetadata } = useOffline();
  const { history } = useHistory();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const searchTimeoutRef = useRef<any>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem('@Koda_search_history');
        if (stored) {
          setSearchHistory(JSON.parse(stored));
        }
      } catch (e) {
        // Ignored
      }
    };
    loadHistory();
  }, []);

  const saveHistory = async (newHistory: string[]) => {
    try {
      setSearchHistory(newHistory);
      await AsyncStorage.setItem('@Koda_search_history', JSON.stringify(newHistory));
    } catch (e) {
      // Ignored
    }
  };

  // Perform search (online or local offline)
  const executeSearch = async (text: string, filterOverride?: 'All' | 'Songs' | 'Albums' | 'Artists' | 'Playlists') => {
    const query = text.trim();
    if (!query) {
      setResults([]);
      setMatchedAlbums([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // If Offline Mode is active, perform ultra-fast instant local search
    if (isOfflineOnly) {
      const qLower = query.toLowerCase();
      const resolvedOffline = offlineTracks.map(ot => {
        return offlineMetadata[ot.id] ||
               history.find(h => h.id === ot.id) ||
               { id: ot.id, title: `Track ${ot.id}`, artist: 'Offline Track', duration: '' };
      });

      const matchedSongs = resolvedOffline.filter(
        t => t.title?.toLowerCase().includes(qLower) || t.artist?.toLowerCase().includes(qLower)
      );
      const matchedLocalAlbums = downloadedAlbums.filter(
        a => a.title?.toLowerCase().includes(qLower) || a.artist?.toLowerCase().includes(qLower)
      );

      setResults(matchedSongs);
      setMatchedAlbums(matchedLocalAlbums);
      setLoading(false);
      return;
    }

    try {
      const filter = filterOverride || activeFilter;
      let endpoint = `${API_URL}/api/search?q=${encodeURIComponent(query)}`;
      if (filter === 'Playlists') {
        endpoint = `${API_URL}/api/search/playlists?q=${encodeURIComponent(query)}`;
      } else if (filter === 'Albums') {
        endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=15`;
      }

      // In "All" filter, fetch albums in parallel to populate the direct albums section
      if (filter === 'All') {
        const itunesAlbumsPromise = fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=6`
        )
          .then(r => r.json())
          .then(data => {
            if (data.results) {
              return data.results.map((item: any) => ({
                id: String(item.collectionId),
                title: item.collectionName,
                artist: item.artistName,
                artworkUrl: (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
                releaseYear: item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : '2024',
                trackCount: item.trackCount || 1,
                type: 'Album'
              }));
            }
            return [];
          })
          .catch(() => []);

        const [mainRes, albData] = await Promise.all([
          fetchWithTimeout(endpoint, { timeout: 8000 }),
          itunesAlbumsPromise
        ]);

        setMatchedAlbums(albData);

        if (mainRes.ok) {
          const data = await mainRes.json();
          setResults(Array.isArray(data) ? data : []);
          const updated = [query, ...searchHistory.filter(q => q.toLowerCase() !== query.toLowerCase())].slice(0, 10);
          saveHistory(updated);
        } else {
          setError('Failed to fetch search results');
        }
      } else {
        const res = await fetchWithTimeout(endpoint, { timeout: 8000 });
        if (res.ok) {
          const data = await res.json();
          if (filter === 'Albums' && data.results) {
            const formatted = data.results.map((item: any) => ({
              id: String(item.collectionId),
              title: item.collectionName,
              artist: item.artistName,
              artworkUrl: (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
              releaseYear: item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : '2024',
              trackCount: item.trackCount || 1,
              type: 'Album'
            }));
            setResults(formatted);
          } else {
            setResults(Array.isArray(data) ? data : []);
          }
          const updated = [query, ...searchHistory.filter(q => q.toLowerCase() !== query.toLowerCase())].slice(0, 10);
          saveHistory(updated);
        } else {
          setError('Failed to fetch search results');
        }
      }
    } catch (e: any) {
      setError('Network error searching tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setSearchQuery('');
    setResults([]);
    setMatchedAlbums([]);
    setLoading(false);
    setError(null);
    inputRef.current?.clear();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    if (!text.trim()) {
      setResults([]);
      setMatchedAlbums([]);
      setLoading(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(text);
    }, 400);
  };

  const handleFilterChange = (filter: 'All' | 'Songs' | 'Albums' | 'Artists' | 'Playlists') => {
    setActiveFilter(filter);
    if (searchQuery.trim()) {
      executeSearch(searchQuery.trim(), filter);
    }
  };

  const clearHistory = async () => {
    saveHistory([]);
  };

  const selectQuery = (q: string) => {
    setSearchQuery(q);
    executeSearch(q);
  };

  const handleInstantPlayToggle = (item: any) => {
    if (currentTrack?.id === item.id) {
      if (player.playing) {
        pause();
      } else {
        resume();
      }
    } else {
      playTrack(item, { source: 'search', tracks: results });
    }
  };

  // Top result candidate (only when in All or Artists filter)
  const topResult = results.length > 0 ? results[0] : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Offline Mode Search Banner */}
      {isOfflineOnly && (
        <View style={styles.offlineSearchNotice}>
          <Ionicons name="cloud-offline" size={16} color="#FF9500" style={{ marginRight: 6 }} />
          <Text style={styles.offlineNoticeText}>Offline Search — Searching downloaded files</Text>
        </View>
      )}

      {/* Search Header */}
      <View style={styles.headerArea}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={isOfflineOnly ? "Search downloaded tracks & albums" : "Songs, artists, albums or a link"}
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity 
              onPress={handleClearSearch} 
              style={styles.inputActionBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={19} color="#8E8E93" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.inputActionBtn}
              onPress={() => Alert.alert('Voice Search', 'To use voice search, tap the microphone button on your device keyboard while typing.')}
            >
              <Ionicons name="mic-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips Row (Visible when searching) */}
        {searchQuery.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {(['All', 'Songs', 'Albums', 'Artists', 'Playlists'] as const).map(filter => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                onPress={() => handleFilterChange(filter)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Main Content Area */}
      {searchQuery.trim().length === 0 ? (
        /* Empty State: Trending Suggestions + Recent Searches + Moods & Genres */
        <ScrollView 
          contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Trending Suggestions Pills */}
          {!isOfflineOnly && (
            <View style={styles.trendingSection}>
              <View style={styles.trendingHeaderRow}>
                <Ionicons name="flash" size={14} color="#FFD700" style={{ marginRight: 4 }} />
                <Text style={styles.trendingLabel}>TRENDING SEARCHES</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
                {TRENDING_SUGGESTIONS.map((item, idx) => (
                  <TouchableOpacity
                    key={`trend-${idx}`}
                    style={styles.trendingPill}
                    onPress={() => selectQuery(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.trendingPillText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Recent Searches */}
          {searchHistory.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Recent</Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>

              {searchHistory.map((query, idx) => (
                <TouchableOpacity
                  key={`hist-${idx}`}
                  style={styles.recentRow}
                  activeOpacity={0.7}
                  onPress={() => selectQuery(query)}
                >
                  <Ionicons name="time-outline" size={18} color="#8E8E93" style={{ marginRight: 12 }} />
                  <Text style={styles.recentQueryText}>{query}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Moods & Genres Section */}
          {!isOfflineOnly && (
            <View style={styles.genresSection}>
              <Text style={styles.sectionHeaderTitle}>Moods & genres</Text>

              <View style={styles.genresGrid}>
                {GENRE_TILES.map(tile => (
                  <TouchableOpacity
                    key={tile.id}
                    style={[styles.genreTile, { backgroundColor: tile.bg }]}
                    activeOpacity={0.8}
                    onPress={() => selectQuery(tile.title)}
                  >
                    <Text style={styles.genreTileTitle}>{tile.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        /* Results View */
        <ScrollView 
          contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : results.length === 0 && matchedAlbums.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>
                {isOfflineOnly
                  ? "No downloaded items match your search. Try another query or disable Offline Mode."
                  : "Try searching for a different song, artist, or album."}
              </Text>
            </View>
          ) : (
            <View>
              {/* Top Result Card */}
              {(activeFilter === 'All' || activeFilter === 'Artists') && topResult && (
                <View style={styles.topResultSection}>
                  <Text style={styles.subSectionTitle}>Top result</Text>
                  
                  <TouchableOpacity 
                    style={styles.topResultCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('Artist', { artistName: topResult.artist, channelId: topResult.channelId })}
                  >
                    <Artwork url={topResult.artworkUrl} size={68} style={styles.topResultArt} />
                    <View style={styles.topResultInfo}>
                      <Text style={styles.topResultName} numberOfLines={1}>{topResult.artist}</Text>
                      <Text style={styles.topResultCategory}>Artist • Popular YouTube Creator</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.topResultPlayBtn}
                      onPress={() => playTrack(topResult, { source: 'search', tracks: results })}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play" size={20} color="#000000" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              )}

              {/* Direct Matching Albums Carousel (in "All" mode) */}
              {activeFilter === 'All' && matchedAlbums.length > 0 && (
                <View style={styles.matchedAlbumsSection}>
                  <Text style={styles.subSectionTitle}>Albums</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchedAlbumsScroll}>
                    {matchedAlbums.map((alb, idx) => (
                      <TouchableOpacity
                        key={`match-alb-${alb.id}-${idx}`}
                        style={styles.albumChipCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('AlbumDetail', { albumId: alb.id, albumData: alb })}
                      >
                        <Artwork url={alb.artworkUrl} size={110} style={styles.albumChipArt} />
                        <Text style={styles.albumChipTitle} numberOfLines={1}>{alb.title}</Text>
                        <Text style={styles.albumChipArtist} numberOfLines={1}>{alb.artist}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Results by Category */}
              {activeFilter === 'Albums' ? (
                <View style={styles.resultsListSection}>
                  <Text style={styles.subSectionTitle}>Albums</Text>
                  {results.slice(0, 15).map((alb, idx) => (
                    <TouchableOpacity
                      key={`alb-res-${alb.id}-${idx}`}
                      style={styles.playlistResultRow}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('AlbumDetail', { albumId: alb.id, albumData: alb })}
                    >
                      <Artwork url={alb.artworkUrl} size={50} style={styles.playlistResultArt} />
                      <View style={styles.songResultInfo}>
                        <Text style={styles.songResultTitle} numberOfLines={1}>{alb.title}</Text>
                        <Text style={styles.songResultArtist} numberOfLines={1}>
                          {alb.artist} {alb.releaseYear ? `• ${alb.releaseYear}` : ''} {alb.trackCount ? `• ${alb.trackCount} tracks` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#71717A" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : activeFilter === 'Playlists' ? (
                <View style={styles.resultsListSection}>
                  <Text style={styles.subSectionTitle}>Playlists</Text>
                  {results.slice(0, 15).map((pl, idx) => (
                    <TouchableOpacity
                      key={`pl-${pl.id}-${idx}`}
                      style={styles.playlistResultRow}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('Artist', { artistName: pl.artist || pl.title, channelId: pl.channelId })}
                    >
                      <Artwork url={pl.artworkUrl} size={50} style={styles.playlistResultArt} />
                      <View style={styles.songResultInfo}>
                        <Text style={styles.songResultTitle} numberOfLines={1}>{pl.title}</Text>
                        <Text style={styles.songResultArtist} numberOfLines={1}>
                          {pl.artist || 'YouTube'} {pl.videoCount ? `• ${pl.videoCount} videos` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#71717A" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                /* Songs List with Instant Play Button */
                <View style={styles.resultsListSection}>
                  <Text style={styles.subSectionTitle}>
                    {activeFilter === 'Artists' ? 'Artist Tracks' : 'Songs'}
                  </Text>
                  {results.slice(0, activeFilter === 'Songs' ? 25 : 15).map((item, idx) => {
                    const isItemPlaying = currentTrack?.id === item.id && player.playing;
                    const isItemActive = currentTrack?.id === item.id;

                    return (
                      <TouchableOpacity
                        key={`res-${item.id}-${idx}`}
                        style={[styles.songResultRow, isItemActive && styles.songResultRowActive]}
                        activeOpacity={0.7}
                        onPress={() => playTrack(item, { source: 'search', tracks: results })}
                      >
                        {/* Instant Play Preview Button */}
                        <TouchableOpacity
                          style={[
                            styles.instantPlayBtn,
                            isItemActive && { backgroundColor: '#1DB954' }
                          ]}
                          onPress={() => handleInstantPlayToggle(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isItemPlaying ? "pause" : "play"}
                            size={14}
                            color={isItemActive ? "#000000" : "#FFFFFF"}
                            style={{ marginLeft: isItemPlaying ? 0 : 2 }}
                          />
                        </TouchableOpacity>

                        <Artwork url={item.artworkUrl} size={46} style={styles.songResultArt} />
                        <View style={styles.songResultInfo}>
                          <Text
                            style={[
                              styles.songResultTitle,
                              isItemActive && { color: '#1DB954', fontWeight: '700' }
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text style={styles.songResultArtist} numberOfLines={1}>{item.artist}</Text>
                        </View>
                        {item.duration && (
                          <Text style={styles.songResultDuration}>{item.duration}</Text>
                        )}
                        <TouchableOpacity 
                          style={styles.dotsBtn} 
                          onPress={() => setSelectedTrack(item)}
                        >
                          <Ionicons name="ellipsis-horizontal" size={18} color="#71717A" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

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
    backgroundColor: '#0A0A0A',
  },
  offlineSearchNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 149, 0, 0.3)',
  },
  offlineNoticeText: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '600',
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  inputActionBtn: {
    padding: 4,
  },
  filtersScroll: {
    flexDirection: 'row',
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    marginRight: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#000000',
  },
  trendingSection: {
    marginTop: 10,
    marginBottom: 14,
  },
  trendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A1A1AA',
    letterSpacing: 0.7,
  },
  trendingScroll: {
    flexDirection: 'row',
  },
  trendingPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  trendingPillText: {
    color: '#E4E4E7',
    fontSize: 12,
    fontWeight: '600',
  },
  recentSection: {
    marginTop: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '600',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recentQueryText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  genresSection: {
    marginTop: 24,
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  genreTile: {
    width: TILE_WIDTH,
    height: 94,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  genreTileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  centerBox: {
    marginTop: 60,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  topResultSection: {
    marginTop: 14,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  topResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 18,
  },
  topResultArt: {
    borderRadius: 34,
  },
  topResultInfo: {
    flex: 1,
    marginLeft: 14,
  },
  topResultName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topResultCategory: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  topResultPlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchedAlbumsSection: {
    marginBottom: 16,
  },
  matchedAlbumsScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  albumChipCard: {
    width: 110,
    marginRight: 12,
  },
  albumChipArt: {
    borderRadius: 8,
    marginBottom: 6,
  },
  albumChipTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  albumChipArtist: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  resultsListSection: {
    marginTop: 6,
  },
  songResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  songResultRowActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  instantPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  songResultArt: {
    borderRadius: 6,
  },
  songResultInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  songResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  songResultArtist: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  songResultDuration: {
    fontSize: 12,
    color: '#71717A',
    marginRight: 6,
    fontVariant: ['tabular-nums'],
  },
  dotsBtn: {
    padding: 6,
  },
  playlistResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  playlistResultArt: {
    borderRadius: 8,
  },
});
