import React, { useState } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useAudio } from '../context/AudioContext';
import { useLibrary } from '../context/LibraryContext';
import { useOffline } from '../context/OfflineContext';
import { useHistory } from '../context/HistoryContext';
import { TrackRow } from '../components/TrackRow';
import { Artwork } from '../components/Artwork';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { EmptyState } from '../components/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

type SubViewType = 'main' | 'favorites' | 'downloads' | 'downloaded_albums' | 'offline' | 'recent' | 'history' | 'stats';

export const LibraryScreen = () => {
  const { playTrack, currentTrack } = useAudio();
  const { favorites, playlists, createPlaylist, deletePlaylist } = useLibrary();
  const { offlineTracks, downloadedAlbums, removeDownloadedAlbum, offlineMetadata, isOfflineOnly, setOfflineOnly, isDownloaded } = useOffline();
  const { history } = useHistory();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [currentView, setCurrentView] = useState<SubViewType>('main');
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [expandedAlbumId, setExpandedAlbumId] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'artist'>('recent');
  const [statsPeriod, setStatsPeriod] = useState<'Week' | 'Month' | 'Year'>('Week');
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreatePlaylist = () => {
    setNewPlaylistName('');
    setShowNewPlaylistModal(true);
  };

  const handleConfirmCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowNewPlaylistModal(false);
    }
  };

  // Resolve offline track metadata if available
  const resolvedOfflineTracks = offlineTracks.map(ot => {
    return offlineMetadata[ot.id] ||
           favorites.find(f => f.id === ot.id) || 
           history.find(h => h.id === ot.id) || 
           { id: ot.id, title: `Track ${ot.id}`, artist: 'Offline Track', album: '', duration: '' };
  });

  // Sub-screens data mapping with active sort applied
  const getSubViewData = () => {
    let rawData: any[] = [];
    let title = '';
    switch (currentView) {
      case 'favorites':
        title = 'Liked Songs';
        rawData = [...favorites];
        break;
      case 'downloads':
        title = 'Downloads';
        rawData = [...resolvedOfflineTracks];
        break;
      case 'downloaded_albums':
        title = 'Downloaded Albums';
        rawData = [];
        break;
      case 'offline':
        title = 'Ready Offline';
        rawData = [...resolvedOfflineTracks];
        break;
      case 'recent':
        title = 'Recently Played';
        rawData = [...history];
        break;
      case 'history':
        title = 'History';
        rawData = [...history];
        break;
      default:
        title = '';
        rawData = [];
    }

    if (sortBy === 'title') {
      rawData.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'artist') {
      rawData.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
    }
    return { title, data: rawData };
  };

  const { title: subViewTitle, data: subViewData } = getSubViewData();

  // Playlists sorted by title if chosen
  const sortedPlaylists = [...playlists].sort((a, b) => {
    if (sortBy === 'title') {
      return (a.name || '').localeCompare(b.name || '');
    }
    return 0;
  });

  // Dynamic Listening Stats Metrics based on selected period
  const getStatsMetrics = () => {
    switch (statsPeriod) {
      case 'Month':
        return {
          listened: '6 hr 45 min',
          streak: '5 days',
          avg: 'Average 14 min a day',
          bars: [
            { day: 'W1', h: 35 },
            { day: 'W2', h: 60 },
            { day: 'W3', h: 85 },
            { day: 'W4', h: 50 },
          ]
        };
      case 'Year':
        return {
          listened: '48 hr 20 min',
          streak: '14 days',
          avg: 'Average 22 min a day',
          bars: [
            { day: 'Q1', h: 40 },
            { day: 'Q2', h: 70 },
            { day: 'Q3', h: 95 },
            { day: 'Q4', h: 55 },
          ]
        };
      case 'Week':
      default:
        return {
          listened: '1 hr 15 min',
          streak: '1 day',
          avg: 'Average 10 min a day',
          bars: [
            { day: 'M', h: 10 },
            { day: 'T', h: 15 },
            { day: 'W', h: 5 },
            { day: 'T', h: 25 },
            { day: 'F', h: 70 },
            { day: 'S', h: 10 },
            { day: 'S', h: 40 },
          ]
        };
    }
  };

  const currentStats = getStatsMetrics();

  const handlePlayAll = () => {
    if (subViewData.length > 0) {
      playTrack(subViewData[0], { source: 'library', tracks: subViewData });
    }
  };

  const handleShufflePlay = () => {
    if (subViewData.length > 0) {
      const randomIndex = Math.floor(Math.random() * subViewData.length);
      playTrack(subViewData[randomIndex], { source: 'library', tracks: subViewData });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* If inside a Sub-View (e.g. Liked Songs, Downloads, Stats) */}
      {currentView !== 'main' ? (
        <View style={styles.subViewWrapper}>
          {/* Sub-view Header */}
          <View style={styles.subHeader}>
            <TouchableOpacity 
              style={styles.backBtn}
              onPress={() => setCurrentView('main')}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle} numberOfLines={1}>{subViewTitle || 'Listening Stats'}</Text>
            <View style={{ width: 36 }} />
          </View>

          {currentView === 'downloaded_albums' ? (
            /* Downloaded Albums Section (Part 4) */
            <FlatList
              data={downloadedAlbums}
              keyExtractor={(item) => `dl-alb-${item.id}`}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
              renderItem={({ item }) => {
                const isCompleted = item.status === 'completed';
                const isDownloading = item.status === 'downloading';
                const downloadedCount = item.downloadedTrackIds?.length || 0;
                const totalCount = item.totalTracks || item.tracks?.length || 0;

                const isExpanded = expandedAlbumId === item.id;

                return (
                  <View style={styles.downloadedAlbumWrapper}>
                    <TouchableOpacity
                      style={styles.downloadedAlbumCard}
                      activeOpacity={0.8}
                      onPress={() => setExpandedAlbumId(isExpanded ? null : item.id)}
                    >
                      <Artwork url={item.artworkUrl} size={64} style={styles.downloadedAlbumArt} />
                      <View style={styles.downloadedAlbumInfo}>
                        <Text style={styles.downloadedAlbumTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.downloadedAlbumArtist} numberOfLines={1}>{item.artist}</Text>
                        
                        <View style={styles.downloadedAlbumBadgeRow}>
                          {isCompleted ? (
                            <View style={styles.completedBadgePill}>
                              <Ionicons name="checkmark-circle" size={13} color="#34C759" style={{ marginRight: 4 }} />
                              <Text style={styles.completedBadgeText}>Completed • {totalCount} tracks</Text>
                            </View>
                          ) : isDownloading ? (
                            <View style={styles.downloadingBadgePill}>
                              <ActivityIndicator size="small" color="#0A84FF" style={{ marginRight: 4, transform: [{ scale: 0.7 }] }} />
                              <Text style={styles.downloadingBadgeText}>Downloading ({downloadedCount}/{totalCount})</Text>
                            </View>
                          ) : (
                            <View style={styles.partialBadgePill}>
                              <Ionicons name="cloud-download-outline" size={13} color="#FF9500" style={{ marginRight: 4 }} />
                              <Text style={styles.partialBadgeText}>Partially Downloaded ({downloadedCount}/{totalCount})</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Expand / Collapse Icon */}
                      <TouchableOpacity
                        style={styles.expandToggleBtn}
                        onPress={() => setExpandedAlbumId(isExpanded ? null : item.id)}
                      >
                        <Ionicons 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color="#A1A1AA" 
                        />
                      </TouchableOpacity>

                      {/* Delete Album Button */}
                      <TouchableOpacity
                        style={styles.deleteAlbumBtn}
                        onPress={() => {
                          Alert.alert(
                            'Delete Downloaded Album',
                            `Are you sure you want to delete "${item.title}" and remove all its downloaded tracks from offline storage?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => removeDownloadedAlbum(item.id)
                              }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#71717A" />
                      </TouchableOpacity>
                    </TouchableOpacity>

                    {/* Expandable Tracklist with Elegant Green Checkmarks */}
                    {isExpanded && item.tracks && item.tracks.length > 0 && (
                      <View style={styles.albumTracklistContainer}>
                        <View style={styles.tracklistHeaderRow}>
                          <Text style={styles.tracklistHeaderText}>OFFLINE TRACKS ({item.tracks.length})</Text>
                          <TouchableOpacity 
                            onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id, albumData: item })}
                          >
                            <Text style={styles.openAlbumPageText}>Open Full Album →</Text>
                          </TouchableOpacity>
                        </View>

                        {item.tracks.map((track: any, tIdx: number) => {
                          const isDownloadedTrack = isDownloaded(track.id, 'mp3');
                          const isPlayingThis = currentTrack?.id === track.id;

                          return (
                            <TouchableOpacity
                              key={`alb-track-${track.id}-${tIdx}`}
                              style={[styles.albumTrackRow, isPlayingThis && styles.albumTrackRowPlaying]}
                              activeOpacity={0.7}
                              onPress={() => playTrack(track, { source: 'album', id: item.id, tracks: item.tracks })}
                            >
                              <Text style={[styles.albumTrackNum, isPlayingThis && { color: '#0A84FF' }]}>
                                {track.trackNumber || tIdx + 1}
                              </Text>

                              <View style={styles.albumTrackInfo}>
                                <Text 
                                  style={[styles.albumTrackTitle, isPlayingThis && { color: '#0A84FF', fontWeight: '700' }]} 
                                  numberOfLines={1}
                                >
                                  {track.title}
                                </Text>
                                <Text style={styles.albumTrackArtist} numberOfLines={1}>
                                  {track.artist}
                                </Text>
                              </View>

                              {/* Elegant Small Green Checkmark (Strictly verified downloads only) */}
                              {isDownloadedTrack ? (
                                <View style={styles.downloadGreenCheck}>
                                  <Ionicons name="checkmark-circle" size={17} color="#34C759" />
                                </View>
                              ) : (
                                <View style={styles.downloadGreenCheck}>
                                  <Ionicons name="cloud-offline-outline" size={17} color="#71717A" />
                                </View>
                              )}

                              <Text style={styles.albumTrackDuration}>{track.duration || '3:30'}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <EmptyState
                  icon="disc-outline"
                  title="No Downloaded Albums Yet"
                  subtitle="Albums you download with one-click will appear here for full offline listening."
                />
              }
            />
          ) : currentView === 'stats' ? (
            /* Listening Stats Screen (Video 2, 00:10) */
            <ScrollView 
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.timeFilterRow}>
                {(['Week', 'Month', 'Year'] as const).map((tab) => (
                  <TouchableOpacity 
                    key={tab} 
                    style={[styles.timeFilterPill, statsPeriod === tab && styles.timeFilterPillActive]}
                    onPress={() => setStatsPeriod(tab)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeFilterText, statsPeriod === tab && styles.timeFilterTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Metric Cards Row */}
              <View style={styles.metricRow}>
                <View style={styles.metricCard}>
                  <Ionicons name="headset" size={24} color="#0A84FF" />
                  <Text style={styles.metricValue}>{currentStats.listened}</Text>
                  <Text style={styles.metricLabel}>Listened</Text>
                </View>

                <View style={styles.metricCard}>
                  <Ionicons name="flame" size={24} color="#FF9500" />
                  <Text style={styles.metricValue}>{currentStats.streak}</Text>
                  <Text style={styles.metricLabel}>Day streak</Text>
                </View>
              </View>

              {/* Activity Chart Card */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Activity ({statsPeriod})</Text>
                  <Text style={styles.chartAvg}>{currentStats.avg}</Text>
                </View>

                <View style={styles.barsContainer}>
                  {currentStats.bars.map((bar, i) => (
                    <View key={i} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: `${bar.h}%` }]} />
                      </View>
                      <Text style={styles.dayLabel}>{bar.day}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionHeading}>Top songs - all time</Text>
              {history.slice(0, 5).map((track, i) => (
                <TrackRow
                  key={`stat-${track.id}-${i}`}
                  title={track.title}
                  artist={track.artist}
                  artworkUrl={track.artworkUrl}
                  onPress={() => playTrack(track, { source: 'library', tracks: history })}
                  onOptionsPress={() => setSelectedTrack(track)}
                />
              ))}
            </ScrollView>
          ) : (
            /* Track List Sub-view with Play & Shuffle Pills */
            <FlatList
              data={subViewData}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
              ListHeaderComponent={
                <View style={styles.actionPillsContainer}>
                  <TouchableOpacity 
                    style={styles.bigActionPill}
                    onPress={handlePlayAll}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.bigActionText}>Play</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.bigActionPill}
                    onPress={handleShufflePlay}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shuffle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.bigActionText}>Shuffle</Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <TrackRow 
                  title={item.title || "Unknown"} 
                  artist={item.artist || "Unknown"} 
                  artworkUrl={item.artworkUrl} 
                  onPress={() => playTrack(item, { source: 'library', tracks: subViewData })} 
                  onOptionsPress={() => setSelectedTrack(item)}
                />
              )}
              ListEmptyComponent={
                <EmptyState 
                  icon="musical-notes-outline" 
                  title={`No ${subViewTitle} Yet`} 
                  subtitle="Tracks will appear here once added or played." 
                />
              }
            />
          )}
        </View>
      ) : (
        /* Main Library Screen (Video 2, 00:06) */
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.mainHeader}>
            <Text style={styles.mainHeaderTitle}>Library</Text>
            
            <View style={styles.headerRightActions}>
              <TouchableOpacity 
                style={styles.iconCircleBtn}
                onPress={() => setShowSortMenu(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="swap-vertical" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.iconCircleBtn, { marginLeft: 10 }]}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.7}
              >
                <Ionicons name="person" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sort Menu Modal */}
          <Modal
            visible={showSortMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSortMenu(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowSortMenu(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.sortPopup, { top: insets.top + 50 }]}>
                  <TouchableOpacity 
                    style={styles.sortItem}
                    onPress={() => { setSortBy('recent'); setShowSortMenu(false); }}
                  >
                    {sortBy === 'recent' && <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />}
                    <Text style={[styles.sortItemText, sortBy !== 'recent' && { marginLeft: 24 }]}>Recently Added</Text>
                  </TouchableOpacity>

                  <View style={styles.sortDivider} />

                  <TouchableOpacity 
                    style={styles.sortItem}
                    onPress={() => { setSortBy('title'); setShowSortMenu(false); }}
                  >
                    {sortBy === 'title' && <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />}
                    <Text style={[styles.sortItemText, sortBy !== 'title' && { marginLeft: 24 }]}>Title</Text>
                  </TouchableOpacity>

                  <View style={styles.sortDivider} />

                  <TouchableOpacity 
                    style={styles.sortItem}
                    onPress={() => { setSortBy('artist'); setShowSortMenu(false); }}
                  >
                    {sortBy === 'artist' && <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />}
                    <Text style={[styles.sortItemText, sortBy !== 'artist' && { marginLeft: 24 }]}>Artist</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Offline Mode Banner if active */}
          {isOfflineOnly && (
            <View style={styles.offlineBanner}>
              <View style={styles.offlineBannerLeft}>
                <Ionicons name="cloud-offline" size={20} color="#FF9500" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.offlineBannerTitle}>Offline Mode Active</Text>
                  <Text style={styles.offlineBannerSubtitle}>Showing downloaded library items</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setOfflineOnly(false)} style={styles.offlineBannerBtn}>
                <Text style={styles.offlineBannerBtnText}>Turn Off</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Grouped iOS-Style Menu Card */}
          <View style={styles.groupedCard}>
            {/* 1. Liked Songs */}
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => setCurrentView('favorites')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconSquare, { backgroundColor: '#FF2D55' }]}>
                <Ionicons name="heart" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.menuTitle}>Liked Songs</Text>
              {favorites.length > 0 && <Text style={styles.menuBadge}>{favorites.length}</Text>}
              <Ionicons name="chevron-forward" size={18} color="#71717A" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* 2. Downloads */}
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => setCurrentView('downloads')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconSquare, { backgroundColor: '#007AFF' }]}>
                <Ionicons name="arrow-down" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.menuTitle}>Downloads</Text>
              {offlineTracks.length > 0 && <Text style={styles.menuBadge}>{offlineTracks.length}</Text>}
              <Ionicons name="chevron-forward" size={18} color="#71717A" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* 3. Downloaded Albums (Part 4) */}
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => setCurrentView('downloaded_albums')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconSquare, { backgroundColor: '#5856D6' }]}>
                <Ionicons name="disc" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.menuTitle}>Downloaded Albums</Text>
              {downloadedAlbums.length > 0 && <Text style={styles.menuBadge}>{downloadedAlbums.length}</Text>}
              <Ionicons name="chevron-forward" size={18} color="#71717A" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* 3. Ready Offline */}
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => setCurrentView('offline')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconSquare, { backgroundColor: '#34C759' }]}>
                <Ionicons name="airplane" size={17} color="#FFFFFF" />
              </View>
              <Text style={styles.menuTitle}>Ready Offline</Text>
              <Ionicons name="chevron-forward" size={18} color="#71717A" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* 4. Recently Played */}
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => setCurrentView('recent')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconSquare, { backgroundColor: '#FF9500' }]}>
                <Ionicons name="time" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.menuTitle}>Recently Played</Text>
              {history.length > 0 && <Text style={styles.menuBadge}>{history.length}</Text>}
              <Ionicons name="chevron-forward" size={18} color="#71717A" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* 5. History */}
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => setCurrentView('history')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconSquare, { backgroundColor: '#FF6B22' }]}>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.menuTitle}>History</Text>
              <Ionicons name="chevron-forward" size={18} color="#71717A" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* 6. Listening Stats */}
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => setCurrentView('stats')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconSquare, { backgroundColor: '#30B0C7' }]}>
                <Ionicons name="bar-chart" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.menuTitle}>Listening Stats</Text>
              <Ionicons name="chevron-forward" size={18} color="#71717A" />
            </TouchableOpacity>
          </View>

          {/* "Your Playlists" Section */}
          <View style={styles.playlistsSection}>
            <Text style={styles.playlistsSectionTitle}>Your Playlists</Text>

            <View style={styles.playlistCardsRow}>
              {/* "+ New Playlist" Card */}
              <TouchableOpacity 
                style={styles.newPlaylistCard}
                onPress={handleCreatePlaylist}
                activeOpacity={0.8}
              >
                <View style={styles.newPlaylistIconBox}>
                  <Ionicons name="add" size={36} color="#7C5CFC" />
                </View>
                <Text style={styles.newPlaylistLabel}>New Playlist</Text>
              </TouchableOpacity>

              {/* User Custom Playlists */}
              {sortedPlaylists.map((pl) => (
                <TouchableOpacity
                  key={pl.id}
                  style={styles.userPlaylistCard}
                  onPress={() => navigation.navigate('PlaylistDetail', { playlistId: pl.id })}
                  onLongPress={() => {
                    Alert.alert(
                      'Delete Playlist',
                      `Are you sure you want to delete "${pl.name}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(pl.id) }
                      ]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.userPlaylistCover}>
                    <Ionicons name="musical-notes" size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.userPlaylistName} numberOfLines={1}>{pl.name}</Text>
                  <Text style={styles.userPlaylistCount}>{pl.tracks.length} tracks</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* New Playlist Modal (Cross-platform iOS & Android) */}
      <Modal
        visible={showNewPlaylistModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewPlaylistModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNewPlaylistModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.createModalCard}>
                <Text style={styles.createModalTitle}>New Playlist</Text>
                <Text style={styles.createModalSubtitle}>Enter a name for your playlist</Text>
                <TextInput
                  style={styles.createModalInput}
                  placeholder="Playlist Name"
                  placeholderTextColor="#8E8E93"
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  autoFocus
                />
                <View style={styles.createModalBtnRow}>
                  <TouchableOpacity 
                    style={[styles.createModalBtn, styles.createModalBtnCancel]}
                    onPress={() => {
                      setNewPlaylistName('');
                      setShowNewPlaylistModal(false);
                    }}
                  >
                    <Text style={styles.createModalBtnTextCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.createModalBtn, styles.createModalBtnConfirm]}
                    onPress={handleConfirmCreatePlaylist}
                  >
                    <Text style={styles.createModalBtnTextConfirm}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
  mainScroll: {
    flex: 1,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  mainHeaderTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sortPopup: {
    position: 'absolute',
    right: 16,
    width: 170,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sortItemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sortDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 10,
  },
  groupedCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    marginTop: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuBadge: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 6,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 60,
  },
  playlistsSection: {
    marginTop: 28,
  },
  playlistsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  playlistCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  newPlaylistCard: {
    width: 130,
    alignItems: 'flex-start',
  },
  newPlaylistIconBox: {
    width: 130,
    height: 130,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPlaylistLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  userPlaylistCard: {
    width: 130,
  },
  userPlaylistCover: {
    width: 130,
    height: 130,
    borderRadius: 14,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPlaylistName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  userPlaylistCount: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  subViewWrapper: {
    flex: 1,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionPillsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bigActionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    height: 44,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  bigActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  timeFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 3,
    marginVertical: 14,
  },
  timeFilterPill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeFilterPillActive: {
    backgroundColor: '#2C2C2E',
  },
  timeFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  timeFilterTextActive: {
    color: '#FFFFFF',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  chartHeader: {
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chartAvg: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 8,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: 8,
    backgroundColor: '#0A84FF',
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 8,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  createModalCard: {
    width: '82%',
    maxWidth: 340,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  createModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  createModalSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  createModalInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  createModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  createModalBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createModalBtnCancel: {
    backgroundColor: '#2C2C2E',
  },
  createModalBtnConfirm: {
    backgroundColor: '#FFFFFF',
  },
  createModalBtnTextCancel: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },
  createModalBtnTextConfirm: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  downloadedAlbumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  downloadedAlbumArt: {
    borderRadius: 10,
    marginRight: 12,
  },
  downloadedAlbumInfo: {
    flex: 1,
    paddingRight: 8,
  },
  downloadedAlbumTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  downloadedAlbumArtist: {
    color: '#8E8E93',
    fontSize: 13,
    marginBottom: 6,
  },
  downloadedAlbumBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  completedBadgeText: {
    color: '#34C759',
    fontSize: 11,
    fontWeight: '600',
  },
  downloadingBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  downloadingBadgeText: {
    color: '#0A84FF',
    fontSize: 11,
    fontWeight: '600',
  },
  partialBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  partialBadgeText: {
    color: '#FF9500',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteAlbumBtn: {
    padding: 8,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.35)',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 14,
  },
  offlineBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  offlineBannerTitle: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '700',
  },
  offlineBannerSubtitle: {
    color: '#D4D4D8',
    fontSize: 11,
    marginTop: 2,
  },
  offlineBannerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.25)',
  },
  offlineBannerBtnText: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '700',
  },
});
