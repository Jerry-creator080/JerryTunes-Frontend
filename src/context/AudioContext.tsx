import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

export interface Track {
  id: string;
  title: string;
  artist: string;
  channelId?: string;
  album: string;
  duration: string;
  artworkUrl?: string;
  audioUrl?: string;
}

export type PlaybackSource = 'search' | 'playlist' | 'recently_played' | 'favorites' | 'downloads' | 'library';

export interface PlaybackContextData {
  source: PlaybackSource;
  id?: string;
  tracks: Track[];
}

interface AudioContextType {
  currentTrack: Track | null;
  playbackContext: PlaybackContextData | null;
  queue: Track[];
  shuffleMode: boolean;
  repeatMode: 'none' | 'all' | 'one';
  isResolving: boolean;
  player: AudioPlayer;
  
  playTrack: (track: Track, context?: PlaybackContextData) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (ms: number) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

function generateShuffledIndices(length: number, firstIndex: number = -1): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  if (firstIndex >= 0 && firstIndex < length) {
    indices.splice(firstIndex, 1);
  }
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  if (firstIndex >= 0 && firstIndex < length) {
    indices.unshift(firstIndex);
  }
  return indices;
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playbackContext, setPlaybackContext] = useState<PlaybackContextData | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [isResolving, setIsResolving] = useState(false);
  
  // Shuffled mapping: keeps track of playback order when shuffle is enabled
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  const player = useAudioPlayer(null, { 
    updateInterval: 500, 
    keepAudioSessionActive: true,
    preferredForwardBufferDuration: 30 // Aggressively cache up to 30s ahead to defeat temporary network lags
  });

  // Use refs for callbacks that need latest state inside event listeners
  const stateRef = useRef({ 
    currentTrack, 
    playbackContext, 
    queue, 
    repeatMode, 
    shuffleMode, 
    shuffledIndices 
  });

  useEffect(() => {
    stateRef.current = { currentTrack, playbackContext, queue, repeatMode, shuffleMode, shuffledIndices };
  }, [currentTrack, playbackContext, queue, repeatMode, shuffleMode, shuffledIndices]);

  useEffect(() => {
    // Configure audio mode for background playback on mount
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  }, []);

  useEffect(() => {
    if (currentTrack) {
      player.setActiveForLockScreen(true, {
        title: currentTrack.title,
        artist: currentTrack.artist,
        albumTitle: currentTrack.album,
        artworkUrl: currentTrack.artworkUrl,
      });
    } else {
      player.clearLockScreenControls();
    }
  }, [currentTrack, player]);

  // We can track didJustFinish from player natively
  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && !stateRef.current.repeatMode) {
        // Wait, didJustFinish fires, we handle next track
      }
    });
    return () => subscription.remove();
  }, [player]);

  // To prevent multiple next calls if didJustFinish triggers heavily:
  // Using a timeout or simple state check.
  const didFinishRef = useRef(false);
  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && !didFinishRef.current) {
        didFinishRef.current = true;
        handleTrackFinish().finally(() => {
          // Reset finish flag after a short delay
          setTimeout(() => { didFinishRef.current = false; }, 1000);
        });
      }
    });
    return () => subscription.remove();
  }, [player]);


  const transitionIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resolveAndPlay = async (track: Track) => {
    const currentTransition = ++transitionIdRef.current;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsResolving(true);
    setCurrentTrack(track);
    player.pause(); // Stop current playback immediately
    
    try {
      let finalAudioUrl = track.audioUrl;
      
      if (!finalAudioUrl && track.id) {
        const { API_URL } = require('../config/api');
        const res = await fetch(`${API_URL}/api/stream?id=${track.id}`, { signal: controller.signal });
        if (!res.ok) {
           console.log('Backend error:', res.status);
           if (currentTransition === transitionIdRef.current) setIsResolving(false);
           return;
        }
        const data = await res.json();
        finalAudioUrl = data.audioUrl;
      }
      
      // If user pressed Next/Previous again while we were fetching the URL, 
      // do NOT overwrite the newer track's state with this old one.
      if (currentTransition !== transitionIdRef.current) {
        console.log(`[AudioContext] Aborting stale track transition for ${track.title}`);
        return;
      }

      if (!finalAudioUrl) {
         console.log('PLAYER SOURCE error: No finalAudioUrl resolved.');
         if (currentTransition === transitionIdRef.current) setIsResolving(false);
         return;
      }

      player.replace(finalAudioUrl);
      player.play();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[AudioContext] Fetch aborted for ${track.title}`);
      } else {
        console.error("Error playing track:", error);
      }
    } finally {
      if (currentTransition === transitionIdRef.current) {
        setIsResolving(false);
      }
    }
  };

  const playTrack = async (track: Track, newContext?: PlaybackContextData) => {
    const { currentTrack: ct, shuffleMode: isShuffle } = stateRef.current;
    
    if (newContext) {
      setPlaybackContext(newContext);
      
      if (isShuffle) {
        const startIndex = newContext.tracks.findIndex(t => t.id === track.id);
        setShuffledIndices(generateShuffledIndices(newContext.tracks.length, startIndex));
      } else {
        setShuffledIndices([]);
      }
    }
    
    // If selecting the exact same track that is already playing/paused, just resume it
    if (ct && ct.id === track.id) {
      if (!player.playing) {
         player.play();
      }
      return;
    }

    await resolveAndPlay(track);
  };

  const getNextTrackFromContext = (offset: number): Track | null => {
    const { currentTrack: ct, playbackContext: ctx, shuffleMode: isShuffle, shuffledIndices: shuff, repeatMode: rm } = stateRef.current;
    if (!ct || !ctx || ctx.tracks.length === 0) return null;

    let currentIndex = -1;
    let collectionLength = ctx.tracks.length;

    if (isShuffle && shuff.length === collectionLength) {
      currentIndex = shuff.findIndex(idx => ctx.tracks[idx].id === ct.id);
    } else {
      currentIndex = ctx.tracks.findIndex(t => t.id === ct.id);
    }

    if (currentIndex === -1) return null;

    let nextIndex = currentIndex + offset;

    // Handle bounds
    if (nextIndex >= collectionLength) {
      if (rm === 'all') {
        nextIndex = nextIndex % collectionLength;
      } else {
        return null; // End of list
      }
    } else if (nextIndex < 0) {
      if (rm === 'all') {
        nextIndex = (nextIndex % collectionLength + collectionLength) % collectionLength;
      } else {
        nextIndex = 0; // Stick to the first
      }
    }

    // Resolve actual track
    const actualTrackIndex = (isShuffle && shuff.length === collectionLength) ? shuff[nextIndex] : nextIndex;
    return ctx.tracks[actualTrackIndex];
  };

  const handleTrackFinish = async () => {
    const { currentTrack: ct, queue: q, repeatMode: rm } = stateRef.current;
    if (!ct) return;
    
    if (rm === 'one') {
      await resolveAndPlay(ct);
      return;
    }

    // Explicit queue takes precedence
    if (q.length > 0) {
      const nextQTrack = q[0];
      setQueue(q.slice(1));
      await resolveAndPlay(nextQTrack);
      return;
    }

    const nextTrack = getNextTrackFromContext(1);
    if (nextTrack) {
      await resolveAndPlay(nextTrack);
    }
  };

  const next = async () => {
    const { queue: q } = stateRef.current;
    
    // Explicit queue takes precedence
    if (q.length > 0) {
      const nextQTrack = q[0];
      setQueue(q.slice(1));
      await resolveAndPlay(nextQTrack);
      return;
    }

    const nextTrack = getNextTrackFromContext(1);
    if (nextTrack) {
      await resolveAndPlay(nextTrack);
    }
  };

  const previous = async () => {
    // If we've played more than 3 seconds, just seek to start.
    if (player.currentTime > 3) {
      await player.seekTo(0);
      player.play();
      return;
    }
    
    // Otherwise, try to go to previous track in context
    const prevTrack = getNextTrackFromContext(-1);
    if (prevTrack) {
      await resolveAndPlay(prevTrack);
    } else {
      // If no prev track (first in list), restart current
      await player.seekTo(0);
      player.play();
    }
  };

  const toggleShuffle = () => {
    const newShuffle = !shuffleMode;
    setShuffleMode(newShuffle);
    
    const { currentTrack: ct, playbackContext: ctx } = stateRef.current;
    if (ctx && ctx.tracks.length > 0) {
      if (newShuffle) {
        const startIndex = ct ? ctx.tracks.findIndex(t => t.id === ct.id) : -1;
        setShuffledIndices(generateShuffledIndices(ctx.tracks.length, startIndex));
      } else {
        setShuffledIndices([]);
      }
    }
  };

  const toggleRepeat = () => {
    setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none');
  };
  
  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
  };
  
  const clearQueue = () => {
    setQueue([]);
  };

  const pause = async () => { player.pause(); };
  const resume = async () => { player.play(); };
  const seek = async (ms: number) => { await player.seekTo(ms / 1000); };

  return (
    <AudioContext.Provider value={{ 
      currentTrack, playbackContext, queue, shuffleMode, repeatMode, isResolving, player,
      playTrack, pause, resume, seek, next, previous, toggleShuffle, toggleRepeat, addToQueue, clearQueue
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};