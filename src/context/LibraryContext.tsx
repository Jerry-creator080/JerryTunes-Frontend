import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from './AudioContext';

const FAVORITES_KEY = '@JerryTunes_favorites';
const PLAYLISTS_KEY = '@JerryTunes_playlists';

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

interface LibraryContextType {
  favorites: Track[];
  toggleFavorite: (track: Track) => Promise<void>;
  isFavorite: (trackId: string) => boolean;
  
  playlists: Playlist[];
  createPlaylist: (name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const storedFavs = await AsyncStorage.getItem(FAVORITES_KEY);
      if (storedFavs) setFavorites(JSON.parse(storedFavs));

      const storedPlaylists = await AsyncStorage.getItem(PLAYLISTS_KEY);
      if (storedPlaylists) setPlaylists(JSON.parse(storedPlaylists));
    } catch (e) {
      console.error("Failed to load library", e);
    }
  };

  const toggleFavorite = async (track: Track) => {
    try {
      const isFav = favorites.some(f => f.id === track.id);
      let newFavorites;
      if (isFav) {
        newFavorites = favorites.filter(f => f.id !== track.id);
      } else {
        newFavorites = [...favorites, track];
      }
      setFavorites(newFavorites);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch (e) {
      console.error("Failed to save favorites", e);
    }
  };

  const isFavorite = (trackId: string) => {
    return favorites.some(f => f.id === trackId);
  };

  const savePlaylists = async (newPlaylists: Playlist[]) => {
    setPlaylists(newPlaylists);
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(newPlaylists));
  };

  const createPlaylist = async (name: string) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      tracks: [],
    };
    await savePlaylists([...playlists, newPlaylist]);
  };

  const deletePlaylist = async (id: string) => {
    await savePlaylists(playlists.filter(p => p.id !== id));
  };

  const addTrackToPlaylist = async (playlistId: string, track: Track) => {
    const newPlaylists = playlists.map(p => {
      if (p.id === playlistId && !p.tracks.some(t => t.id === track.id)) {
        return { ...p, tracks: [...p.tracks, track] };
      }
      return p;
    });
    await savePlaylists(newPlaylists);
  };

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    const newPlaylists = playlists.map(p => {
      if (p.id === playlistId) {
        return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
      }
      return p;
    });
    await savePlaylists(newPlaylists);
  };

  return (
    <LibraryContext.Provider value={{ 
      favorites, toggleFavorite, isFavorite,
      playlists, createPlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist
    }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
