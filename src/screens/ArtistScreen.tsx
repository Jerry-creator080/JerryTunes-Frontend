import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudio, Track } from '../context/AudioContext';
import { useOffline } from '../context/OfflineContext';
import { Artwork } from '../components/Artwork';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { API_URL } from '../config/api';

const { width } = Dimensions.get('window');
const ARTIST_HERO_HEIGHT = 260;
const FOLLOWED_ARTISTS_KEY = '@JerryTunes_followed_artists';

export const ArtistScreen = ({ route, navigation }: any) => {
  const { artistName } = route.params || {};
  const insets = useSafeAreaInsets();
  const { playTrack, currentTrack } = useAudio();
  const { isDownloaded, downloadTrack } = useOffline();

  const [artistProfile, setArtistProfile] = useState<any>({ name: artistName, artworkUrl: '' });
  const [popularSongs, setPopularSongs] = useState<Track[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [allAlbums, setAllAlbums] = useState<any[]>([]);
  const [singlesAndEPs, setSinglesAndEPs] = useState<any[]>([]);
  const [relatedArtists, setRelatedArtists] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);

  useEffect(() => {
    fetchArtistData();
    checkFollowStatus();
  }, [artistName]);

  const checkFollowStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem(FOLLOWED_ARTISTS_KEY);
      if (stored) {
        const list = JSON.parse(stored) as string[];
        setIsFollowing(list.includes(artistName));
      }
    } catch (e) {
      // Ignored
    }
  };

  const toggleFollow = async () => {
    try {
      const stored = await AsyncStorage.getItem(FOLLOWED_ARTISTS_KEY);
      let list: string[] = stored ? JSON.parse(stored) : [];
      if (isFollowing) {
        list = list.filter(a => a !== artistName);
        setIsFollowing(false);
      } else {
        list.push(artistName);
        setIsFollowing(true);
      }
      await AsyncStorage.setItem(FOLLOWED_ARTISTS_KEY, JSON.stringify(list));
    } catch (e) {
      // Ignored
    }
  };

  const fetchArtistData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/artist?name=${encodeURIComponent(artistName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.artist) setArtistProfile(data.artist);
        if (data.popularSongs) setPopularSongs(data.popularSongs);
        if (data.topAlbums) setTopAlbums(data.topAlbums);
        if (data.allAlbums) setAllAlbums(data.allAlbums);
        if (data.singlesAndEPs) setSinglesAndEPs(data.singlesAndEPs);
        if (data.relatedArtists) setRelatedArtists(data.relatedArtists);
      } else {
        setError('Failed to load artist details.');
      }
    } catch (e) {
      setError('Network error loading artist.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (popularSongs.length === 0) return;
    playTrack(popularSongs[0], { source: 'artist', id: artistName, tracks: popularSongs });
  };

  const handleShuffle = () => {
    if (popularSongs.length === 0) return;
    const shuffled = [...popularSongs].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], { source: 'artist', id: artistName, tracks: shuffled });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Floating Navigation Header */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBackBtn}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{artistProfile.name || artistName}</Text>
        <TouchableOpacity
          onPress={() => Share.share({ message: `Check out ${artistName} on JerryTunes!` })}
          style={styles.navShareBtn}
        >
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading {artistName}...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchArtistData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Artist Banner & Avatar */}
          <View style={styles.heroBanner}>
            {artistProfile.artworkUrl ? (
              <Image source={{ uri: artistProfile.artworkUrl }} style={styles.heroImage} blurRadius={12} />
            ) : null}
            <View style={styles.heroOverlay} />

            <View style={styles.avatarWrapper}>
              {artistProfile.artworkUrl ? (
                <Image source={{ uri: artistProfile.artworkUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person" size={54} color="#A1A1AA" />
                </View>
              )}
            </View>

            <Text style={styles.artistNameText}>{artistProfile.name || artistName}</Text>
            {artistProfile.genre ? (
              <Text style={styles.artistGenreText}>{artistProfile.genre} • Verified Artist</Text>
            ) : null}

            {/* Follow & Action Buttons */}
            <View style={styles.heroActionsRow}>
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={toggleFollow}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFollowing ? 'checkmark' : 'heart-outline'}
                  size={16}
                  color={isFollowing ? '#34C759' : '#FFFFFF'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.followBtnText, isFollowing && { color: '#34C759' }]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Play All & Shuffle Buttons Row */}
          <View style={styles.playbackButtonsRow}>
            <TouchableOpacity
              style={styles.playAllButton}
              onPress={handlePlayAll}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={20} color="#000000" style={{ marginRight: 6 }} />
              <Text style={styles.playAllText}>Play All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shuffleButton}
              onPress={handleShuffle}
              activeOpacity={0.8}
            >
              <Ionicons name="shuffle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.shuffleText}>Shuffle</Text>
            </TouchableOpacity>
          </View>

          {/* 1. Popular Songs Section */}
          {popularSongs.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Popular Songs</Text>
              {popularSongs.slice(0, 5).map((track, idx) => {
                const isPlaying = currentTrack?.id === track.id;
                const downloaded = isDownloaded(track.id, 'mp3');

                return (
                  <TouchableOpacity
                    key={`pop-${track.id}-${idx}`}
                    style={[styles.popularRow, isPlaying && styles.popularRowPlaying]}
                    activeOpacity={0.7}
                    onPress={() => playTrack(track, { source: 'artist', id: artistName, tracks: popularSongs })}
                  >
                    <Text style={styles.popularRankText}>{idx + 1}</Text>
                    <Artwork url={track.artworkUrl} size={48} style={styles.popularArtwork} />
                    
                    <View style={styles.popularInfoCol}>
                      <Text style={[styles.popularTitle, isPlaying && { color: '#0A84FF' }]} numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text style={styles.popularArtist} numberOfLines={1}>{track.artist}</Text>
                    </View>

                    {track.duration ? (
                      <Text style={styles.popularDuration}>{track.duration}</Text>
                    ) : null}

                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => {
                        if (!downloaded) downloadTrack(track, 'mp3');
                      }}
                    >
                      <Ionicons
                        name={downloaded ? 'checkmark-circle' : 'arrow-down-circle-outline'}
                        size={20}
                        color={downloaded ? '#34C759' : '#71717A'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => setSelectedTrack(track)}
                    >
                      <Ionicons name="ellipsis-horizontal" size={18} color="#71717A" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 2. Top Albums Horizontal Carousel */}
          {topAlbums.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Top Albums</Text>
              <FlatList
                horizontal
                data={topAlbums}
                keyExtractor={(item) => `top-alb-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalListPadding}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.albumCard}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id, albumData: item })}
                  >
                    <Artwork url={item.artworkUrl} size={140} style={styles.albumArtwork} />
                    <Text style={styles.albumCardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.albumCardMeta} numberOfLines={1}>
                      {item.releaseYear || 'Album'} • {item.trackCount || 1} tracks
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* 3. All Albums Section */}
          {allAlbums.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>All Albums</Text>
              <FlatList
                horizontal
                data={allAlbums}
                keyExtractor={(item) => `all-alb-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalListPadding}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.albumCard}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id, albumData: item })}
                  >
                    <Artwork url={item.artworkUrl} size={140} style={styles.albumArtwork} />
                    <Text style={styles.albumCardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.albumCardMeta} numberOfLines={1}>
                      {item.releaseYear} • {item.trackCount} tracks
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* 4. Singles & EPs Section */}
          {singlesAndEPs.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Singles & EPs</Text>
              <FlatList
                horizontal
                data={singlesAndEPs}
                keyExtractor={(item) => `single-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalListPadding}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.albumCard}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id, albumData: item })}
                  >
                    <Artwork url={item.artworkUrl} size={140} style={styles.albumArtwork} />
                    <Text style={styles.albumCardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.albumCardMeta} numberOfLines={1}>
                      {item.type || 'Single'} • {item.releaseYear}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* 5. Related Artists Section */}
          {relatedArtists.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Fans Also Like</Text>
              <FlatList
                horizontal
                data={relatedArtists}
                keyExtractor={(item) => `rel-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalListPadding}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.relatedArtistCard}
                    activeOpacity={0.7}
                    onPress={() => navigation.push('Artist', { artistName: item.name })}
                  >
                    <Image source={{ uri: item.artworkUrl }} style={styles.relatedArtistAvatar} />
                    <Text style={styles.relatedArtistName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.relatedArtistRole}>Artist</Text>
                  </TouchableOpacity>
                )}
              />
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
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 48,
    zIndex: 10,
  },
  navBackBtn: {
    padding: 8,
  },
  navTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  navShareBtn: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#A1A1AA',
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#27272A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  heroBanner: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.25,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 10, 0.7)',
  },
  avatarWrapper: {
    width: 128,
    height: 128,
    borderRadius: 64,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistNameText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  artistGenreText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 14,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  followingBtn: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderColor: '#34C759',
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  playbackButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 14,
  },
  playAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 24,
    marginRight: 10,
  },
  playAllText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  shuffleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    height: 48,
    borderRadius: 24,
  },
  shuffleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalListPadding: {
    paddingHorizontal: 16,
  },
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  popularRowPlaying: {
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  popularRankText: {
    width: 22,
    color: '#71717A',
    fontSize: 14,
    fontWeight: '600',
  },
  popularArtwork: {
    borderRadius: 6,
    marginRight: 12,
  },
  popularInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  popularTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  popularArtist: {
    color: '#8E8E93',
    fontSize: 13,
  },
  popularDuration: {
    color: '#8E8E93',
    fontSize: 13,
    marginRight: 8,
  },
  iconBtn: {
    padding: 6,
  },
  albumCard: {
    width: 140,
    marginRight: 14,
  },
  albumArtwork: {
    borderRadius: 10,
    marginBottom: 8,
  },
  albumCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  albumCardMeta: {
    color: '#8E8E93',
    fontSize: 12,
  },
  relatedArtistCard: {
    alignItems: 'center',
    width: 100,
    marginRight: 16,
  },
  relatedArtistAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 8,
    backgroundColor: '#1C1C1E',
  },
  relatedArtistName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  relatedArtistRole: {
    color: '#8E8E93',
    fontSize: 11,
  },
});
