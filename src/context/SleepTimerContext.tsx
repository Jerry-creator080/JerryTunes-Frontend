import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface SleepTimerContextType {
  timerEndMs: number | null;
  remainingMinutes: number | null;
  setTimer: (minutes: number) => void;
  clearTimer: () => void;
  onTimerFinish: (() => void) | null;
  setOnTimerFinish: (cb: () => void) => void;
}

const SleepTimerContext = createContext<SleepTimerContextType | undefined>(undefined);

export const SleepTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timerEndMs, setTimerEndMs] = useState<number | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
  
  // We use a ref to store the callback so we can call pause() from AudioContext
  const onFinishRef = useRef<(() => void) | null>(null);

  const setOnTimerFinish = (cb: () => void) => {
    onFinishRef.current = cb;
  };

  const setTimer = (minutes: number) => {
    setTimerEndMs(Date.now() + minutes * 60000);
    setRemainingMinutes(minutes);
  };

  const clearTimer = () => {
    setTimerEndMs(null);
    setRemainingMinutes(null);
  };

  useEffect(() => {
    if (!timerEndMs) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= timerEndMs) {
        clearTimer();
        if (onFinishRef.current) {
          onFinishRef.current();
        }
      } else {
        const remaining = Math.ceil((timerEndMs - now) / 60000);
        setRemainingMinutes(remaining);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [timerEndMs]);

  return (
    <SleepTimerContext.Provider value={{ 
      timerEndMs, 
      remainingMinutes, 
      setTimer, 
      clearTimer,
      onTimerFinish: onFinishRef.current,
      setOnTimerFinish 
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
