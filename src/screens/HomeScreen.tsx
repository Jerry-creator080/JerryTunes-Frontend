import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useHistory } from '../context/HistoryContext';
import { useOffline } from '../context/OfflineContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { Artwork } from '../components/Artwork';
import { API_URL, fetchWithTimeout } from '../config/api';

const { width } = Dimensions.get('window');

export const HomeScreen = ({ navigation }: any) => {
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [feedMode, setFeedMode] = useState<'music' | 'video'>('music');
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  const [trending, setTrending] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  const { playTrack } = useAudio();
  const { history } = useHistory();
  const { isOfflineOnly, setOfflineOnly, offlineTracks, downloadedAlbums, offlineMetadata } = useOffline();
  const insets = useSafeAreaInsets();

  const resolvedOfflineTracks = offlineTracks.map(ot => {
    return offlineMetadata[ot.id] ||
           history.find(h => h.id === ot.id) ||
           { id: ot.id, title: `Track ${ot.id}`, artist: 'Downloaded Track', duration: '' };
  });

  // Dynamic greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    if (isOfflineOnly) return;
    let isMounted = true;
    const fetchHomeFeed = async () => {
      setFeedLoading(true);
      try {
        const res = await fetchWithTimeout(`${API_URL}/api/home`, { timeout: 8000 });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.trending) setTrending(data.trending);
            if (data.topAlbums) setTopAlbums(data.topAlbums);
            if (data.topArtists) setTopArtists(data.topArtists);
            if (data.videos) setVideos(data.videos);
          }
        }
      } catch (err) {
        // Fallback gracefully
      } finally {
        if (isMounted) setFeedLoading(false);
      }
    };

    fetchHomeFeed();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={[styles.screenWrapper, { paddingTop: insets.top }]}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        {/* Pill Dropdown Button */}
        <TouchableOpacity
          style={styles.pillDropdown}
          onPress={() => setShowModeDropdown(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={feedMode === 'music' ? 'musical-notes' : 'play'}
            size={16}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.pillText}>
            {feedMode === 'music' ? 'Music' : 'Video'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#A1A1AA" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {/* Profile / Avatar Button */}
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <View style={styles.avatarInner}>
            <Ionicons name="person" size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Mode Switcher Modal */}
      <Modal
        visible={showModeDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModeDropdown(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowModeDropdown(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.dropdownMenu, { top: insets.top + 50 }]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setFeedMode('music');
                  setShowModeDropdown(false);
                }}
              >
                <Ionicons name="musical-notes" size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.dropdownItemText}>Music</Text>
                {feedMode === 'music' && <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>

              <View style={styles.dropdownDivider} />

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setFeedMode('video');
                  setShowModeDropdown(false);
                }}
              >
                <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.dropdownItemText}>Video</Text>
                {feedMode === 'video' && <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Main Feed Content */}
      {feedMode === 'music' ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
          </View>

          {/* Offline Mode Indicator Banner */}
          {isOfflineOnly && (
            <View style={styles.offlineBanner}>
              <View style={styles.offlineBannerLeft}>
                <Ionicons name="cloud-offline" size={22} color="#FF9500" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.offlineBannerTitle}>Offline Mode Active</Text>
                  <Text style={styles.offlineBannerSubtitle}>Playing on-device downloaded tracks & albums</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setOfflineOnly(false)} style={styles.offlineBannerBtn}>
                <Text style={styles.offlineBannerBtnText}>Turn Off</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* If in Offline Mode, display downloaded music sections */}
          {isOfflineOnly ? (
            <View>
              {/* Offline Downloaded Songs */}
              {resolvedOfflineTracks.length > 0 && (
                <View style={styles.sectionContainer}>
                  <TouchableOpacity
                    style={styles.clickableSectionHeader}
                    onPress={() => navigation.navigate('Library')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sectionTitle}>Downloaded Songs</Text>
                    <Ionicons name="chevron-forward" size={18} color="#A1A1AA" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>

                  <FlatList
                    horizontal
                    data={resolvedOfflineTracks}
                    keyExtractor={(item, index) => `off-song-${item.id}-${index}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalListPadding}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.albumCard}
                        activeOpacity={0.7}
                        onPress={() => playTrack(item, { source: 'downloads', tracks: resolvedOfflineTracks })}
                      >
                        <Artwork url={item.artworkUrl} size={135} style={styles.albumArt} />
                        <Text style={styles.albumTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.albumArtist} numberOfLines={1}>{item.artist}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* Offline Downloaded Albums */}
              {downloadedAlbums.length > 0 && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderCol}>
                    <Text style={styles.sectionSubTag}>SAVED LOCALLY</Text>
                    <Text style={styles.sectionTitle}>Downloaded Albums</Text>
                  </View>

                  <FlatList
                    horizontal
                    data={downloadedAlbums}
                    keyExtractor={(item) => `off-alb-${item.id}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalListPadding}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.albumCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id, albumData: item })}
                      >
                        <Artwork url={item.artworkUrl} size={135} style={styles.albumArt} />
                        <Text style={styles.albumTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.albumArtist} numberOfLines={1}>
                          {item.artist} • {item.downloadedTrackIds?.length || item.totalTracks} tracks
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* Empty Offline State */}
              {resolvedOfflineTracks.length === 0 && downloadedAlbums.length === 0 && (
                <View style={styles.emptyOfflineBox}>
                  <Ionicons name="cloud-offline-outline" size={48} color="#71717A" style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyOfflineTitle}>No Downloads Available</Text>
                  <Text style={styles.emptyOfflineDesc}>
                    You haven't downloaded any tracks or albums yet. Turn off Offline Mode to browse and stream online music.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyTurnOffBtn}
                    onPress={() => setOfflineOnly(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyTurnOffBtnText}>Disable Offline Mode</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            /* Online Content Flow */
            <View>
              {/* 1. "Recently Played" Horizontal Carousel - STRICTLY USER PLAYED TRACKS ONLY */}
              {history.length > 0 && (
                <View style={styles.sectionContainer}>
                  <TouchableOpacity
                    style={styles.clickableSectionHeader}
                    onPress={() => navigation.navigate('Library')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sectionTitle}>Recently Played</Text>
                    <Ionicons name="chevron-forward" size={18} color="#A1A1AA" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>

                  <FlatList
                    horizontal
                    data={history}
                    keyExtractor={(item, index) => `rec-${item.id}-${index}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalListPadding}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.albumCard}
                        activeOpacity={0.7}
                        onPress={() => playTrack(item, { source: 'recently_played', tracks: history })}
                      >
                        <Artwork url={item.artworkUrl} size={135} style={styles.albumArt} />
                        <Text style={styles.albumTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.albumArtist} numberOfLines={1}>{item.artist}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* 2. "Top Albums / Discover Albums" Carousel */}
              {topAlbums.length > 0 && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderCol}>
                    <Text style={styles.sectionSubTag}>EXPLORE RELEASES</Text>
                    <Text style={styles.sectionTitle}>Top Albums</Text>
                  </View>

                  <FlatList
                    horizontal
                    data={topAlbums}
                    keyExtractor={(item) => `alb-${item.id}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalListPadding}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.albumCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id, albumData: item })}
                      >
                        <Artwork url={item.artworkUrl} size={135} style={styles.albumArt} />
                        <Text style={styles.albumTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.albumArtist} numberOfLines={1}>
                          {item.artist} • {item.releaseYear || 'Album'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* 3. "Top Artists" Carousel */}
              {topArtists.length > 0 && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderCol}>
                    <Text style={styles.sectionSubTag}>DISCOVER TALENT</Text>
                    <Text style={styles.sectionTitle}>Top Artists</Text>
                  </View>

                  <FlatList
                    horizontal
                    data={topArtists}
                    keyExtractor={(item) => `art-${item.id}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalListPadding}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.artistCircleCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('Artist', { artistName: item.name })}
                      >
                        <Image source={{ uri: item.artworkUrl }} style={styles.artistAvatar} />
                        <Text style={styles.artistCardName} numberOfLines={1}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        /* Video Mode Feed (as seen in Video 2 at 00:12) */
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>Videos</Text>
          </View>

          {feedLoading && videos.length === 0 ? (
            <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 40 }} />
          ) : (
            videos.map((vid, index) => (
              <TouchableOpacity
                key={`vid-${vid.id}-${index}`}
                style={styles.videoCard}
                activeOpacity={0.85}
                onPress={() => {
                  playTrack(vid, { source: 'quick_picks', tracks: videos });
                  navigation.navigate('NowPlaying');
                }}
              >
                <View style={styles.thumbnailWrapper}>
                  <Artwork url={vid.artworkUrl} size={width - 32} style={styles.videoThumbnail} />
                  {vid.duration && (
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationBadgeText}>{vid.duration}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.videoMetaRow}>
                  <View style={styles.channelAvatarPlaceholder}>
                    <Ionicons name="musical-notes" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.videoMetaInfo}>
                    <Text style={styles.videoTitle} numberOfLines={2}>{vid.title}</Text>
                    <Text style={styles.videoSubtitle} numberOfLines={1}>
                      {vid.artist} • {vid.views || 'Trending'} • {vid.uploadedAt || 'Recently'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.dotsBtn} onPress={() => setSelectedTrack(vid)}>
                    <Ionicons name="ellipsis-vertical" size={18} color="#71717A" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
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
  screenWrapper: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
  },
  pillDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  avatarBtn: {
    padding: 2,
  },
  avatarInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2A2A2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  dropdownMenu: {
    position: 'absolute',
    left: 16,
    width: 170,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 12,
    marginVertical: 2,
  },
  container: {
    flex: 1,
  },
  greetingContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSection: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  heroCollage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroThumb: {
    borderRadius: 8,
  },
  heroThumbOverlap: {
    borderRadius: 8,
    marginLeft: -18,
    opacity: 0.85,
  },
  heroInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  heroTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#9E9EA4',
    marginTop: 4,
  },
  heroPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  sectionContainer: {
    marginTop: 22,
  },
  sectionHeaderCol: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionSubTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  clickableSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  horizontalListPadding: {
    paddingHorizontal: 16,
    gap: 14,
  },
  albumCard: {
    width: 135,
  },
  albumArt: {
    borderRadius: 8,
  },
  albumTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 6,
  },
  albumArtist: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  quickPicksList: {
    paddingHorizontal: 16,
  },
  quickPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  quickPickArt: {
    borderRadius: 6,
  },
  quickPickInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  quickPickTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickPickArtist: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  dotsBtn: {
    padding: 6,
  },
  artistCircleCard: {
    alignItems: 'center',
    width: 96,
  },
  artistAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#27272A',
  },
  artistCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  chartCard: {
    width: 220,
  },
  chartImage: {
    width: 220,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#27272A',
  },
  chartCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 6,
  },
  chartCardSubtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  videoCard: {
    marginBottom: 20,
  },
  thumbnailWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoThumbnail: {
    borderRadius: 12,
    height: 190,
  },
  durationBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  videoMetaRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'flex-start',
  },
  channelAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  videoMetaInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  videoSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 3,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.35)',
    marginHorizontal: 16,
    marginBottom: 12,
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
  emptyOfflineBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyOfflineTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyOfflineDesc: {
    color: '#A1A1AA',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyTurnOffBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyTurnOffBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
});
