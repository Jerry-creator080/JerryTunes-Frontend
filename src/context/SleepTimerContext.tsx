import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SleepTimerContextType {
  timerEndMs: number | null;
  remainingMinutes: number | null;
  remainingSeconds: number | null;
  totalDurationSeconds: number | null;
  isEndOfTrack: boolean;
  enableFadeOut: boolean;
  setEnableFadeOut: (val: boolean) => void;
  setTimer: (minutes: number) => void;
  setEndOfTrackTimer: () => void;
  clearTimer: () => void;
  onTimerFinish: (() => void) | null;
  setOnTimerFinish: (cb: () => void) => void;
  onVolumeFade: ((factor: number) => void) | null;
  setOnVolumeFade: (cb: (factor: number) => void) => void;
}

const SleepTimerContext = createContext<SleepTimerContextType | undefined>(undefined);

const FADE_OUT_STORAGE_KEY = '@JerryTunes_sleep_fade_out';

export const SleepTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timerEndMs, setTimerEndMs] = useState<number | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number | null>(null);
  const [isEndOfTrack, setIsEndOfTrack] = useState<boolean>(false);
  const [enableFadeOut, setEnableFadeOutState] = useState<boolean>(true);

  const onFinishRef = useRef<(() => void) | null>(null);
  const onFadeRef = useRef<((factor: number) => void) | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(FADE_OUT_STORAGE_KEY).then(val => {
      if (val !== null) {
        setEnableFadeOutState(val === 'true');
      }
    }).catch(() => {});
  }, []);

  const setEnableFadeOut = (val: boolean) => {
    setEnableFadeOutState(val);
    AsyncStorage.setItem(FADE_OUT_STORAGE_KEY, String(val)).catch(() => {});
  };

  const setOnTimerFinish = (cb: () => void) => {
    onFinishRef.current = cb;
  };

  const setOnVolumeFade = (cb: (factor: number) => void) => {
    onFadeRef.current = cb;
  };

  const setTimer = (minutes: number) => {
    const totalSec = minutes * 60;
    const end = Date.now() + totalSec * 1000;
    setTimerEndMs(end);
    setTotalDurationSeconds(totalSec);
    setRemainingSeconds(totalSec);
    setRemainingMinutes(minutes);
    setIsEndOfTrack(false);
  };

  const setEndOfTrackTimer = () => {
    setIsEndOfTrack(true);
    setTimerEndMs(null);
    setTotalDurationSeconds(null);
    setRemainingSeconds(null);
    setRemainingMinutes(null);
  };

  const clearTimer = () => {
    setTimerEndMs(null);
    setTotalDurationSeconds(null);
    setRemainingSeconds(null);
    setRemainingMinutes(null);
    setIsEndOfTrack(false);
    // Restore full volume if fading was in progress
    if (onFadeRef.current) {
      onFadeRef.current(1.0);
    }
  };

  useEffect(() => {
    if (!timerEndMs) return;

    // 1-second interval for smooth countdown and fade-out volume curve
    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = timerEndMs - now;

      if (diffMs <= 0) {
        clearTimer();
        if (onFinishRef.current) {
          onFinishRef.current();
        }
      } else {
        const sec = Math.ceil(diffMs / 1000);
        setRemainingSeconds(sec);
        setRemainingMinutes(Math.ceil(sec / 60));

        // Smooth volume fade-out over last 30 seconds
        if (enableFadeOut && sec <= 30 && onFadeRef.current) {
          const factor = Math.max(0, sec / 30);
          onFadeRef.current(factor);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerEndMs, enableFadeOut]);

  return (
    <SleepTimerContext.Provider value={{
      timerEndMs,
      remainingMinutes,
      remainingSeconds,
      totalDurationSeconds,
      isEndOfTrack,
      enableFadeOut,
      setEnableFadeOut,
      setTimer,
      setEndOfTrackTimer,
      clearTimer,
      onTimerFinish: onFinishRef.current,
      setOnTimerFinish,
      onVolumeFade: onFadeRef.current,
      setOnVolumeFade,
    }}>
      {children}
    </SleepTimerContext.Provider>
  );
};

export const useSleepTimer = () => {
  const context = useContext(SleepTimerContext);
  if (context === undefined) {
    throw new Error('useSleepTimer must be used within a SleepTimerProvider');
  }
  return context;
};
