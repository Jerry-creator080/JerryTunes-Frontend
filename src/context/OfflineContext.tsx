import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths, File } from 'expo-file-system';
import { Track } from './AudioContext';

const OFFLINE_TRACKS_KEY = '@JerryTunes_offline_tracks';

type DownloadFormat = 'mp3' | 'mp4_720' | 'mp4_1080';

interface OfflineContextType {
  offlineTracks: { id: string, format: DownloadFormat }[]; 
  downloadTrack: (track: Track, format: DownloadFormat) => Promise<void>;
  isDownloaded: (trackId: string, format?: DownloadFormat) => boolean;
  getLocalUri: (trackId: string, format: DownloadFormat) => string | null;
  downloadProgress: { [key: string]: number };
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [offlineTracks, setOfflineTracks] = useState<{ id: string, format: DownloadFormat }[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadOfflineData();
  }, []);

  const loadOfflineData = async () => {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_TRACKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { id: string, format: DownloadFormat }[];
        // Verify physical files exist
        const verified = [];
        for (const track of parsed) {
          const file = new File(Paths.document, `track_${track.id}.${track.format}`);
          if (file.exists) {
            verified.push(track);
          }
        }
        setOfflineTracks(verified);
        if (verified.length !== parsed.length) {
          await AsyncStorage.setItem(OFFLINE_TRACKS_KEY, JSON.stringify(verified));
        }
      }
    } catch (e) {
      console.error("Failed to load offline tracks data", e);
    }
  };

  const getLocalUri = (trackId: string, format: DownloadFormat) => {
    const isSaved = offlineTracks.find(t => t.id === trackId && t.format === format);
    if (!isSaved) return null;
    return `${Paths.document.uri}track_${trackId}.${format}`;
  };

  const downloadTrack = async (track: Track, format: DownloadFormat) => {
    // If Web, just trigger a normal browser download via our proxy server
    if (Platform.OS === 'web') {
      const url = `http://localhost:3000/api/download?id=${track.id}&format=${format}&title=${encodeURIComponent(track.title)}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.title}.${format.includes('mp4') ? 'mp4' : 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      const newOfflineTracks = [...offlineTracks, { id: track.id, format }];
      setOfflineTracks(newOfflineTracks);
      await AsyncStorage.setItem(OFFLINE_TRACKS_KEY, JSON.stringify(newOfflineTracks));
      return;
    }

    setDownloadProgress(prev => ({ ...prev, [track.id]: 0.1 }));

    try {
      // Resolve proper single-file download URL
      const { API_URL } = require('../config/api');
      const res = await fetch(`${API_URL}/api/resolve-download?id=${track.id}`);
      let downloadUrl = null;

      if (res.ok) {
        const data = await res.json();
        if (format === 'mp3') downloadUrl = data.audioUrl;
        if (format === 'mp4_720') downloadUrl = data.video720Url || data.fallbackVideoUrl;
        if (format === 'mp4_1080') downloadUrl = data.video1080Url || data.video720Url || data.fallbackVideoUrl;
      }

      if (!downloadUrl) {
        throw new Error("Could not resolve valid download URL for this format");
      }
      
      const destination = new File(Paths.document, `track_${track.id}.${format}`);
      
      console.log(`Downloading ${track.title} to ${destination.uri}...`);
      
      // We don't have download progress in basic expo-file-system File API yet,
      // but we set it to 0.5 to show it's actively downloading
      setDownloadProgress(prev => ({ ...prev, [track.id]: 0.5 }));
      
      await File.downloadFileAsync(downloadUrl, destination);
      
      const newOfflineTracks = [...offlineTracks.filter(t => t.id !== track.id || t.format !== format), { id: track.id, format }];
      setOfflineTracks(newOfflineTracks);
      await AsyncStorage.setItem(OFFLINE_TRACKS_KEY, JSON.stringify(newOfflineTracks));
      
      setDownloadProgress(prev => ({ ...prev, [track.id]: 1.0 }));
      console.log(`Downloaded ${track.title} successfully.`);
    } catch (e) {
      console.error("Failed to download track", e);
      setDownloadProgress(prev => {
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
    }
  };

  const isDownloaded = (trackId: string, format?: DownloadFormat) => {
    if (format) {
      return offlineTracks.some(t => t.id === trackId && t.format === format);
    }
    return offlineTracks.some(t => t.id === trackId);
  };

  return (
    <OfflineContext.Provider value={{ offlineTracks, downloadTrack, isDownloaded, getLocalUri, downloadProgress }}>
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
