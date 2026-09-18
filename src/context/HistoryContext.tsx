import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from './AudioContext';

const HISTORY_KEY = '@JerryTunes_history';

interface HistoryContextType {
  history: Track[];
  addTrackToHistory: (track: Track) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<Track[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const addTrackToHistory = async (track: Track) => {
    try {
      // Remove it if it exists to bring it to the top
      const filtered = history.filter(t => t.id !== track.id);
      const newHistory = [track, ...filtered].slice(0, 50); // Keep last 50 tracks
      
      setHistory(newHistory);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  const clearHistory = async () => {
    try {
      setHistory([]);
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.error("Failed to clear history", e);
    }
  };

  return (
    <HistoryContext.Provider value={{ history, addTrackToHistory, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
