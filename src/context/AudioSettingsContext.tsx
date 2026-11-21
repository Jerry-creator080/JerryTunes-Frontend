import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AudioQuality = 'normal' | 'high' | 'ultra';
export type EqualizerPreset = 'flat' | 'bass_boost' | 'vocal' | 'acoustic' | 'rock' | 'electronic' | 'classical';

interface AudioSettingsContextType {
  streamingQuality: AudioQuality;
  downloadQuality: AudioQuality;
  equalizerPreset: EqualizerPreset;
  setStreamingQuality: (quality: AudioQuality) => Promise<void>;
  setDownloadQuality: (quality: AudioQuality) => Promise<void>;
  setEqualizerPreset: (preset: EqualizerPreset) => Promise<void>;
  getQualityLabel: (quality: AudioQuality) => string;
  getPresetLabel: (preset: EqualizerPreset) => string;
}

const AudioSettingsContext = createContext<AudioSettingsContextType | undefined>(undefined);

const STREAMING_QUALITY_KEY = '@JerryTunes_streaming_quality';
const DOWNLOAD_QUALITY_KEY = '@JerryTunes_download_quality';
const EQUALIZER_PRESET_KEY = '@JerryTunes_equalizer_preset';

export const AudioSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [streamingQuality, setStreamingQualityState] = useState<AudioQuality>('high');
  const [downloadQuality, setDownloadQualityState] = useState<AudioQuality>('ultra');
  const [equalizerPreset, setEqualizerPresetState] = useState<EqualizerPreset>('flat');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [sq, dq, eq] = await Promise.all([
        AsyncStorage.getItem(STREAMING_QUALITY_KEY),
        AsyncStorage.getItem(DOWNLOAD_QUALITY_KEY),
        AsyncStorage.getItem(EQUALIZER_PRESET_KEY),
      ]);
      if (sq === 'normal' || sq === 'high' || sq === 'ultra') setStreamingQualityState(sq);
      if (dq === 'normal' || dq === 'high' || dq === 'ultra') setDownloadQualityState(dq);
      if (eq) setEqualizerPresetState(eq as EqualizerPreset);
    } catch (e) {
      // Ignored
    }
  };

  const setStreamingQuality = async (quality: AudioQuality) => {
    setStreamingQualityState(quality);
    await AsyncStorage.setItem(STREAMING_QUALITY_KEY, quality);
  };

  const setDownloadQuality = async (quality: AudioQuality) => {
    setDownloadQualityState(quality);
    await AsyncStorage.setItem(DOWNLOAD_QUALITY_KEY, quality);
  };

  const setEqualizerPreset = async (preset: EqualizerPreset) => {
    setEqualizerPresetState(preset);
    await AsyncStorage.setItem(EQUALIZER_PRESET_KEY, preset);
  };

  const getQualityLabel = (quality: AudioQuality) => {
    switch (quality) {
      case 'normal':
        return 'Normal (128 kbps)';
      case 'high':
        return 'High (256 kbps)';
      case 'ultra':
        return 'Ultra HD (320 kbps)';
      default:
        return 'High (256 kbps)';
    }
  };

  const getPresetLabel = (preset: EqualizerPreset) => {
    switch (preset) {
      case 'flat':
        return 'Flat (Balanced)';
      case 'bass_boost':
        return 'Bass Boost ⚡';
      case 'vocal':
        return 'Vocal Clarity 🎤';
      case 'acoustic':
        return 'Acoustic 🎸';
      case 'rock':
        return 'Rock & Drive 🎸';
      case 'electronic':
        return 'Electronic / Dance 🎛️';
      case 'classical':
        return 'Classical / Orchestral 🎻';
      default:
        return 'Flat (Balanced)';
    }
  };

  return (
    <AudioSettingsContext.Provider
      value={{
        streamingQuality,
        downloadQuality,
        equalizerPreset,
        setStreamingQuality,
        setDownloadQuality,
        setEqualizerPreset,
        getQualityLabel,
        getPresetLabel,
      }}
    >
      {children}
    </AudioSettingsContext.Provider>
  );
};

export const useAudioSettings = () => {
  const context = useContext(AudioSettingsContext);
  if (context === undefined) {
    throw new Error('useAudioSettings must be used within an AudioSettingsProvider');
  }
  return context;
};
