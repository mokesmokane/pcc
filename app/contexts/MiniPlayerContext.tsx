import React, { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useCurrentTrack } from '../stores/audioStore.hooks';
import { useWeeklySelections } from './WeeklySelectionsContext';

const MINI_PLAYER_HEIGHT = 66;

interface MiniPlayerContextValue {
  isMiniPlayerVisible: boolean;
  miniPlayerHeight: number;
}

const MiniPlayerContext = createContext<MiniPlayerContextValue>({
  isMiniPlayerVisible: false,
  miniPlayerHeight: 0,
});

interface MiniPlayerProviderProps {
  children: ReactNode;
}

export function MiniPlayerProvider({ children }: MiniPlayerProviderProps) {
  const { currentTrack } = useCurrentTrack();
  const { userChoice } = useWeeklySelections();

  const value = useMemo(() => ({
    isMiniPlayerVisible: !!(currentTrack && userChoice),
    miniPlayerHeight: currentTrack && userChoice ? MINI_PLAYER_HEIGHT : 0,
  }), [currentTrack, userChoice]);

  return (
    <MiniPlayerContext.Provider value={value}>
      {children}
    </MiniPlayerContext.Provider>
  );
}

export function useMiniPlayer() {
  return useContext(MiniPlayerContext);
}
