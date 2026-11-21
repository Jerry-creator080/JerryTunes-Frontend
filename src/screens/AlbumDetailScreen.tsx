import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio, Track } from '../context/AudioContext';
import { useOffline } from '../context/OfflineContext';
import { Artwork } from '../components/Artwork';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { API_URL } from '../config/api';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(width * 0.58, 240);

export const AlbumDetailScreen = ({ route, navigation }: any) => {
  const { albumId, albumData } = route.params || {};
  const insets = useSafeAreaInsets();
  const { playTrack, currentTrack } = useAudio();
  const {
    downloadAlbum,
    cancelAlbumDownload,
    removeDownloadedAlbum,
    downloadTrack,
    isDownloaded,
    getAlbumStatus,
    albumProgress
  } = useOffline();

  const [album, setAlbum] = useState<any>(albumData || null);
  const [tracks, setTracks] = useState<Track[]>(albumData?.tracks || []);
  const [loading, setLoading] = useState(!albumData?.tracks);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);

  const activeAlbumId = String(album?.id || albumId);
  const currentAlbumProgress = albumProgress[activeAlbumId];
  const albumStatus = getAlbumStatus(activeAlbumId);

  useEffect(() => {
    fetchAlbumDetails();
  }, [albumId]);

  const fetchAlbumDetails = async () => {
    if (!albumId && albumData?.tracks) {
      setTracks(albumData.tracks);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const endpoint = albumId 
        ? `${API_URL}/api/album?id=${encodeURIComponent(albumId)}`
        : `${API_URL}/api/album?query=${encodeURIComponent(albumData?.title || 'album')}`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setAlbum(data.album);
        setTracks(data.tracks || []);
      } else {
        // Fallback to existing passed data if remote query fails
        if (albumData) {
          setAlbum(albumData);
          setTracks(albumData.tracks || []);
        } else {
          setError('Failed to load album details.');
        }
      }
    } catch (e: any) {
      if (albumData) {
        setAlbum(albumData);
        setTracks(albumData.tracks || []);
      } else {
        setError('Network error loading album.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    // Play tracks in original album order
    playTrack(tracks[0], { source: 'album', id: activeAlbumId, tracks });
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], { source: 'album', id: activeAlbumId, tracks: shuffled });
  };

  const handleDownloadAlbum = () => {
    if (tracks.length === 0) return;

    if (albumStatus.status === 'downloading') {
      cancelAlbumDownload(activeAlbumId);
      return;
    }

    if (albumStatus.status === 'completed') {
      Alert.alert(
        'Downloaded Album',
        `"${album?.title}" is already completely downloaded.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove Album',
            style: 'destructive',
            onPress: () => removeDownloadedAlbum(activeAlbumId)
          }
        ]
      );
      return;
    }

    // Start download
    downloadAlbum(album, tracks);
  };

  const handleShareAlbum = async () => {
    try {
      await Share.share({
        message: `Listen to "${album?.title}" by ${album?.artist} on JerryTunes!`,
        title: album?.title
      });
    } catch (e) {
      // Ignored
    }
  };

  const renderHeader = () => {
    if (!album) return null;

    const isDownloading = currentAlbumProgress !== undefined || albumStatus.status === 'downloading';
    const isCompleted = albumStatus.status === 'completed';
    const isPartial = albumStatus.status === 'partial';

    return (
      <View style={styles.headerContainer}>
        {/* Large Album Artwork */}
        <View style={styles.artworkContainer}>
          <Artwork url={album.artworkUrl} size={ARTWORK_SIZE} style={styles.artwork} />
        </View>

        {/* Album Metadata */}
        <Text style={styles.albumTitle} numberOfLines={2}>{album.title}</Text>
        
        <TouchableOpacity 
          onPress={() => navigation.navigate('Artist', { artistName: album.artist })}
          activeOpacity={0.7}
        >
          <Text style={styles.artistName} numberOfLines={1}>{album.artist}</Text>
        </TouchableOpacity>

        <Text style={styles.albumSubMeta}>
          {album.type || 'Album'} • {album.releaseYear || '2024'} • {album.trackCount || tracks.length} tracks{album.totalDuration ? ` • ${album.totalDuration}` : ''}
        </Text>

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

        {/* Dedicated "Download Entire Album" Action Button */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[
              styles.downloadAlbumBtn,
              isCompleted && styles.downloadAlbumBtnCompleted,
              isDownloading && styles.downloadAlbumBtnDownloading
            ]}
            onPress={handleDownloadAlbum}
            activeOpacity={0.85}
          >
            {isDownloading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.downloadAlbumText}>
                  Downloading... ({currentAlbumProgress?.current || albumStatus.count}/{currentAlbumProgress?.total || albumStatus.total})
                </Text>
              </>
            ) : isCompleted ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" style={{ marginRight: 8 }} />
                <Text style={[styles.downloadAlbumText, { color: '#34C759' }]}>Completely Downloaded</Text>
              </>
            ) : isPartial ? (
              <>
                <Ionicons name="cloud-download-outline" size={20} color="#FF9500" style={{ marginRight: 8 }} />
                <Text style={[styles.downloadAlbumText, { color: '#FF9500' }]}>
                  Resume Download ({albumStatus.count}/{albumStatus.total})
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="arrow-down-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.downloadAlbumText}>Download Entire Album</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={styles.iconCircleBtn} onPress={handleShareAlbum} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Live Download Progress Card */}
        {isDownloading && currentAlbumProgress && (
          <View style={styles.progressCard}>
            <View style={styles.progressCardHeader}>
              <Text style={styles.progressAlbumTitle} numberOfLines={1}>Downloading {album.title}</Text>
              <Text style={styles.progressNumbers}>
                {currentAlbumProgress.current} / {currentAlbumProgress.total} Tracks
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${currentAlbumProgress.percent}%` }]} />
            </View>
            {currentAlbumProgress.currentTrackTitle ? (
              <Text style={styles.currentTrackDownloadingText} numberOfLines={1}>
                {currentAlbumProgress.currentTrackTitle}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.divider} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBackBtn}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{album?.title || 'Album'}</Text>
        <TouchableOpacity onPress={handleShareAlbum} style={styles.navShareBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading album tracks...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAlbumDetails}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isPlaying = currentTrack?.id === item.id;
            const downloaded = isDownloaded(item.id, 'mp3');

            return (
              <TouchableOpacity
                style={[styles.trackRow, isPlaying && styles.trackRowPlaying]}
                activeOpacity={0.7}
                onPress={() => playTrack(item, { source: 'album', id: activeAlbumId, tracks })}
              >
                {/* Track Number */}
                <View style={styles.trackNumberCol}>
                  {isPlaying ? (
                    <Ionicons name="volume-high" size={16} color="#0A84FF" />
                  ) : (
                    <Text style={styles.trackNumberText}>{item.trackNumber || index + 1}</Text>
                  )}
                </View>

                {/* Song Info */}
                <View style={styles.trackInfoCol}>
                  <Text style={[styles.trackTitleText, isPlaying && { color: '#0A84FF' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.trackArtistText} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </View>

                {/* Duration */}
                <Text style={styles.trackDurationText}>{item.duration || '3:30'}</Text>

                {/* Download Status Badge / Action */}
                <TouchableOpacity
                  style={styles.downloadTrackBtn}
                  onPress={() => {
                    if (!downloaded) downloadTrack(item, 'mp3');
                  }}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name={downloaded ? 'checkmark-circle' : 'arrow-down-circle-outline'}
                    size={20}
                    color={downloaded ? '#34C759' : '#71717A'}
                  />
                </TouchableOpacity>

                {/* Ellipsis / Options Button */}
                <TouchableOpacity
                  style={styles.trackOptionsBtn}
                  onPress={() => setSelectedTrack(item)}
                  activeOpacity={0.6}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color="#71717A" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
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
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 48,
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
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  artworkContainer: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 20,
  },
  artwork: {
    borderRadius: 16,
  },
  albumTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  artistName: {
    color: '#0A84FF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  albumSubMeta: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 18,
  },
  playbackButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  actionButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  downloadAlbumBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    paddingHorizontal: 16,
  },
  downloadAlbumBtnCompleted: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderColor: '#34C759',
  },
  downloadAlbumBtnDownloading: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    borderColor: '#0A84FF',
  },
  downloadAlbumText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  iconCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressAlbumTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  progressNumbers: {
    color: '#0A84FF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 2,
  },
  currentTrackDownloadingText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
  },
  divider: {
    width: '100%',
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 6,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  trackRowPlaying: {
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  trackNumberCol: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackNumberText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
  trackInfoCol: {
    flex: 1,
    paddingRight: 10,
  },
  trackTitleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackArtistText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '400',
  },
  trackDurationText: {
    color: '#8E8E93',
    fontSize: 13,
    marginRight: 12,
  },
  downloadTrackBtn: {
    padding: 6,
    marginRight: 4,
  },
  trackOptionsBtn: {
    padding: 6,
  },
});

