import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths, File } from 'expo-file-system';
import { Track } from './AudioContext';

const OFFLINE_TRACKS_KEY = '@JerryTunes_offline_tracks';
const DOWNLOADED_ALBUMS_KEY = '@JerryTunes_downloaded_albums';
const OFFLINE_TRACK_METADATA_KEY = '@JerryTunes_offline_metadata';
const OFFLINE_ONLY_KEY = '@JerryTunes_is_offline_only';

export type DownloadFormat = 'mp3' | 'mp4_720' | 'mp4_1080';

export interface DownloadedAlbum {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  releaseYear?: string;
  totalTracks: number;
  downloadedTrackIds: string[];
  tracks: Track[];
  status: 'downloading' | 'completed' | 'partial';
}

export interface AlbumProgress {
  current: number;
  total: number;
  percent: number;
  currentTrackTitle?: string;
}

interface OfflineContextType {
  isOfflineOnly: boolean;
  setOfflineOnly: (enabled: boolean) => Promise<void>;
  toggleOfflineOnly: () => Promise<void>;
  offlineTracks: { id: string; format: DownloadFormat }[];
  offlineMetadata: { [id: string]: Track };
  downloadedAlbums: DownloadedAlbum[];
  downloadProgress: { [key: string]: number };
  albumProgress: { [albumId: string]: AlbumProgress };
  downloadTrack: (track: Track, format?: DownloadFormat) => Promise<boolean>;
  deleteTrack: (trackId: string, format?: DownloadFormat) => Promise<void>;
  downloadAlbum: (album: any, tracks: Track[]) => Promise<void>;
  cancelAlbumDownload: (albumId: string) => void;
  removeDownloadedAlbum: (albumId: string) => Promise<void>;
  isDownloaded: (trackId: string, format?: DownloadFormat) => boolean;
  getAlbumStatus: (albumId: string) => { isDownloaded: boolean; status: 'completed' | 'partial' | 'downloading' | 'none'; count: number; total: number };
  getLocalUri: (trackId: string, format?: DownloadFormat) => string | null;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOfflineOnly, setIsOfflineOnly] = useState(false);
  const [offlineTracks, setOfflineTracks] = useState<{ id: string; format: DownloadFormat }[]>([]);
  const [offlineMetadata, setOfflineMetadata] = useState<{ [id: string]: Track }>({});
  const [downloadedAlbums, setDownloadedAlbums] = useState<DownloadedAlbum[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [albumProgress, setAlbumProgress] = useState<{ [albumId: string]: AlbumProgress }>({});

  const cancelTokensRef = useRef<{ [albumId: string]: boolean }>({});

  useEffect(() => {
    loadOfflineData();
  }, []);

  const loadOfflineData = async () => {
    try {
      // 0. Load offline only mode preference
      const storedOfflineOnly = await AsyncStorage.getItem(OFFLINE_ONLY_KEY);
      if (storedOfflineOnly !== null) {
        setIsOfflineOnly(storedOfflineOnly === 'true');
      }

      // 1. Load offline tracks & verify physical files
      const storedTracks = await AsyncStorage.getItem(OFFLINE_TRACKS_KEY);
      let verifiedTracks: { id: string; format: DownloadFormat }[] = [];
      if (storedTracks) {
        const parsed = JSON.parse(storedTracks) as { id: string; format: DownloadFormat }[];
        for (const track of parsed) {
          try {
            const file = new File(Paths.document, `track_${track.id}.${track.format}`);
            if (file.exists) {
              verifiedTracks.push(track);
            }
          } catch (e) {
            // Keep track if check fails
            verifiedTracks.push(track);
          }
        }
        setOfflineTracks(verifiedTracks);
        if (verifiedTracks.length !== parsed.length) {
          await AsyncStorage.setItem(OFFLINE_TRACKS_KEY, JSON.stringify(verifiedTracks));
        }
      }

      // 2. Load cached offline track metadata
      const storedMeta = await AsyncStorage.getItem(OFFLINE_TRACK_METADATA_KEY);
      if (storedMeta) {
        setOfflineMetadata(JSON.parse(storedMeta));
      }

      // 3. Load downloaded albums & reconcile statuses
      const storedAlbums = await AsyncStorage.getItem(DOWNLOADED_ALBUMS_KEY);
      if (storedAlbums) {
        const parsedAlbums = JSON.parse(storedAlbums) as DownloadedAlbum[];
        const verifiedAlbums = parsedAlbums.map(album => {
          // Reconcile: count how many album tracks actually exist in verifiedTracks
          const validTrackIds = album.tracks
            .filter(t => verifiedTracks.some(ot => ot.id === t.id))
            .map(t => t.id);

          let status: 'downloading' | 'completed' | 'partial' = album.status;
          if (validTrackIds.length === 0) {
            status = 'partial';
          } else if (validTrackIds.length >= album.totalTracks) {
            status = 'completed';
          } else {
            status = 'partial';
          }

          return {
            ...album,
            downloadedTrackIds: validTrackIds,
            status: album.status === 'downloading' ? 'partial' : status,
          };
        });

        // Filter out albums where 0 tracks remain
        const activeAlbums = verifiedAlbums.filter(a => a.downloadedTrackIds.length > 0);
        setDownloadedAlbums(activeAlbums);
        await AsyncStorage.setItem(DOWNLOADED_ALBUMS_KEY, JSON.stringify(activeAlbums));
      }
    } catch (e) {
      console.error('Failed to load offline tracks data', e);
    }
  };

  const setOfflineOnly = async (enabled: boolean) => {
    setIsOfflineOnly(enabled);
    try {
      await AsyncStorage.setItem(OFFLINE_ONLY_KEY, String(enabled));
    } catch (e) {
      // Ignored
    }
  };

  const toggleOfflineOnly = async () => {
    const nextVal = !isOfflineOnly;
    setIsOfflineOnly(nextVal);
    try {
      await AsyncStorage.setItem(OFFLINE_ONLY_KEY, String(nextVal));
    } catch (e) {
      // Ignored
    }
  };

  const getLocalUri = (trackId: string, format: DownloadFormat = 'mp3') => {
    const isSaved = offlineTracks.find(t => t.id === trackId && t.format === format);
    if (!isSaved) return null;
    return `${Paths.document.uri}track_${trackId}.${format}`;
  };

  const isDownloaded = (trackId: string, format?: DownloadFormat) => {
    if (format) {
      return offlineTracks.some(t => t.id === trackId && t.format === format);
    }
    return offlineTracks.some(t => t.id === trackId);
  };

  const saveMetadata = async (track: Track) => {
    try {
      const updated = { ...offlineMetadata, [track.id]: track };
      setOfflineMetadata(updated);
      await AsyncStorage.setItem(OFFLINE_TRACK_METADATA_KEY, JSON.stringify(updated));
    } catch (e) {
      // Ignored
    }
  };

  const downloadTrack = async (track: Track, format: DownloadFormat = 'mp3'): Promise<boolean> => {
    if (isDownloaded(track.id, format)) {
      return true;
    }

    if (Platform.OS === 'web') {
      const { API_URL } = require('../config/api');
      const url = `${API_URL}/api/download?id=${track.id}&format=${format}&title=${encodeURIComponent(track.title)}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.title}.${format.includes('mp4') ? 'mp4' : 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      const newOfflineTracks = [...offlineTracks, { id: track.id, format }];
      setOfflineTracks(newOfflineTracks);
      await AsyncStorage.setItem(OFFLINE_TRACKS_KEY, JSON.stringify(newOfflineTracks));
      await saveMetadata(track);
      return true;
    }

    setDownloadProgress(prev => ({ ...prev, [track.id]: 0.1 }));

    try {
      const { API_URL } = require('../config/api');
      // Supports querying by YouTube ID or track query
      const queryParam = track.id.startsWith('itunes_')
        ? `query=${encodeURIComponent(`${track.title} ${track.artist}`)}`
        : `id=${encodeURIComponent(track.id)}`;

      const res = await fetch(`${API_URL}/api/resolve-download?${queryParam}&quality=ultra`);
      let downloadUrl = null;

      if (res.ok) {
        const data = await res.json();
        if (format === 'mp3') downloadUrl = data.audioUrl;
        if (format === 'mp4_720') downloadUrl = data.video720Url || data.fallbackVideoUrl;
        if (format === 'mp4_1080') downloadUrl = data.video1080Url || data.video720Url || data.fallbackVideoUrl;
      }

      if (!downloadUrl) {
        throw new Error('Could not resolve valid download URL');
      }

      const destination = new File(Paths.document, `track_${track.id}.${format}`);
      setDownloadProgress(prev => ({ ...prev, [track.id]: 0.5 }));

      await File.downloadFileAsync(downloadUrl, destination);

      const newOfflineTracks = [
        ...offlineTracks.filter(t => t.id !== track.id || t.format !== format),
        { id: track.id, format }
      ];
      setOfflineTracks(newOfflineTracks);
      await AsyncStorage.setItem(OFFLINE_TRACKS_KEY, JSON.stringify(newOfflineTracks));
      await saveMetadata(track);

      setDownloadProgress(prev => ({ ...prev, [track.id]: 1.0 }));
      return true;
    } catch (e) {
      console.error(`Failed to download track "${track.title}":`, e);
      setDownloadProgress(prev => {
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
      return false;
    }
  };

  const deleteTrack = async (trackId: string, format: DownloadFormat = 'mp3') => {
    try {
      const file = new File(Paths.document, `track_${trackId}.${format}`);
      if (file.exists) {
        file.delete();
      }

      const updated = offlineTracks.filter(t => !(t.id === trackId && t.format === format));
      setOfflineTracks(updated);
      await AsyncStorage.setItem(OFFLINE_TRACKS_KEY, JSON.stringify(updated));

      // Reconcile albums
      const updatedAlbums = downloadedAlbums.map(album => {
        if (album.downloadedTrackIds.includes(trackId)) {
          const newIds = album.downloadedTrackIds.filter(id => id !== trackId);
          return {
            ...album,
            downloadedTrackIds: newIds,
            status: (newIds.length >= album.totalTracks ? 'completed' : 'partial') as 'completed' | 'partial',
          };
        }
        return album;
      }).filter(a => a.downloadedTrackIds.length > 0);

      setDownloadedAlbums(updatedAlbums);
      await AsyncStorage.setItem(DOWNLOADED_ALBUMS_KEY, JSON.stringify(updatedAlbums));
    } catch (e) {
      console.error('Error deleting offline track', e);
    }
  };

  // One-Click Complete Album Download Manager
  const downloadAlbum = async (album: any, tracks: Track[]) => {
    const albumId = String(album.id);
    cancelTokensRef.current[albumId] = false;

    const total = tracks.length;
    let completedCount = tracks.filter(t => isDownloaded(t.id, 'mp3')).length;

    // Initialize progress state
    setAlbumProgress(prev => ({
      ...prev,
      [albumId]: {
        current: completedCount,
        total,
        percent: total > 0 ? Math.round((completedCount / total) * 100) : 0,
        currentTrackTitle: 'Preparing download...'
      }
    }));

    // Register album as downloading in state & AsyncStorage
    const existingIndex = downloadedAlbums.findIndex(a => a.id === albumId);
    const initialAlbumRecord: DownloadedAlbum = {
      id: albumId,
      title: album.title,
      artist: album.artist,
      artworkUrl: album.artworkUrl,
      releaseYear: album.releaseYear || '',
      totalTracks: total,
      downloadedTrackIds: tracks.filter(t => isDownloaded(t.id, 'mp3')).map(t => t.id),
      tracks: tracks,
      status: 'downloading'
    };

    let updatedAlbumsList = existingIndex >= 0
      ? downloadedAlbums.map((a, i) => i === existingIndex ? initialAlbumRecord : a)
      : [...downloadedAlbums, initialAlbumRecord];

    setDownloadedAlbums(updatedAlbumsList);
    await AsyncStorage.setItem(DOWNLOADED_ALBUMS_KEY, JSON.stringify(updatedAlbumsList));

    const successfullyDownloadedIds: string[] = [...initialAlbumRecord.downloadedTrackIds];

    // Download tracks sequentially to preserve bandwidth and provide smooth progress
    for (let i = 0; i < tracks.length; i++) {
      if (cancelTokensRef.current[albumId]) {
        console.log(`Album download cancelled for "${album.title}"`);
        break;
      }

      const track = tracks[i];

      // Skip already downloaded tracks
      if (isDownloaded(track.id, 'mp3')) {
        if (!successfullyDownloadedIds.includes(track.id)) {
          successfullyDownloadedIds.push(track.id);
        }
        continue;
      }

      setAlbumProgress(prev => ({
        ...prev,
        [albumId]: {
          current: successfullyDownloadedIds.length,
          total,
          percent: Math.round((successfullyDownloadedIds.length / total) * 100),
          currentTrackTitle: track.title
        }
      }));

      const success = await downloadTrack(track, 'mp3');
      if (success) {
        successfullyDownloadedIds.push(track.id);
      }

      // Update progress after each track
      setAlbumProgress(prev => ({
        ...prev,
        [albumId]: {
          current: successfullyDownloadedIds.length,
          total,
          percent: Math.round((successfullyDownloadedIds.length / total) * 100),
          currentTrackTitle: track.title
        }
      }));
    }

    // Determine final status
    const finalStatus: 'completed' | 'partial' =
      successfullyDownloadedIds.length >= total ? 'completed' : 'partial';

    const finalAlbumRecord: DownloadedAlbum = {
      ...initialAlbumRecord,
      downloadedTrackIds: successfullyDownloadedIds,
      status: finalStatus
    };

    setDownloadedAlbums(prev => {
      const idx = prev.findIndex(a => a.id === albumId);
      const nextList = idx >= 0
        ? prev.map((a, i) => i === idx ? finalAlbumRecord : a)
        : [...prev, finalAlbumRecord];
      AsyncStorage.setItem(DOWNLOADED_ALBUMS_KEY, JSON.stringify(nextList));
      return nextList;
    });

    // Clear active progress indicator after 2 seconds
    setTimeout(() => {
      setAlbumProgress(prev => {
        const next = { ...prev };
        delete next[albumId];
        return next;
      });
    }, 2000);
  };

  const cancelAlbumDownload = (albumId: string) => {
    cancelTokensRef.current[albumId] = true;
    setAlbumProgress(prev => {
      const next = { ...prev };
      delete next[albumId];
      return next;
    });

    setDownloadedAlbums(prev => {
      const nextList = prev.map(a => a.id === albumId ? { ...a, status: 'partial' as const } : a);
      AsyncStorage.setItem(DOWNLOADED_ALBUMS_KEY, JSON.stringify(nextList));
      return nextList;
    });
  };

  const removeDownloadedAlbum = async (albumId: string) => {
    const targetAlbum = downloadedAlbums.find(a => a.id === albumId);
    if (!targetAlbum) return;

    // 1. Delete physical audio files for all album tracks
    for (const track of targetAlbum.tracks) {
      try {
        const file = new File(Paths.document, `track_${track.id}.mp3`);
        if (file.exists) {
          file.delete();
        }
      } catch (e) {
        // Ignored
      }
    }

    // 2. Remove tracks from offlineTracks state
    const trackIdsSet = new Set(targetAlbum.tracks.map(t => t.id));
    const newOfflineTracks = offlineTracks.filter(ot => !trackIdsSet.has(ot.id));
    setOfflineTracks(newOfflineTracks);
    await AsyncStorage.setItem(OFFLINE_TRACKS_KEY, JSON.stringify(newOfflineTracks));

    // 3. Remove album from downloadedAlbums state
    const newDownloadedAlbums = downloadedAlbums.filter(a => a.id !== albumId);
    setDownloadedAlbums(newDownloadedAlbums);
    await AsyncStorage.setItem(DOWNLOADED_ALBUMS_KEY, JSON.stringify(newDownloadedAlbums));
  };

  const getAlbumStatus = (albumId: string) => {
    const album = downloadedAlbums.find(a => a.id === albumId);
    if (!album) {
      return { isDownloaded: false, status: 'none' as const, count: 0, total: 0 };
    }
    const count = album.downloadedTrackIds.length;
    const total = album.totalTracks;
    const isCompleted = count >= total && total > 0;
    return {
      isDownloaded: count > 0,
      status: album.status,
      count,
      total
    };
  };

  return (
    <OfflineContext.Provider
      value={{
        isOfflineOnly,
        setOfflineOnly,
        toggleOfflineOnly,
        offlineTracks,
        offlineMetadata,
        downloadedAlbums,
        downloadProgress,
        albumProgress,
        downloadTrack,
        deleteTrack,
        downloadAlbum,
        cancelAlbumDownload,
        removeDownloadedAlbum,
        isDownloaded,
        getAlbumStatus,
        getLocalUri,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
