import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ChapterRepository } from '../data/repositories/chapter.repository';
import type Chapter from '../data/models/chapter.model';
import type { ChapterData} from '../services/chapter.service';
import { chapterService } from '../services/chapter.service';
import { useDatabase } from './DatabaseContext';
import { isPodcastClubEpisode } from '../utils/episodeUtils';

interface ChaptersContextType {
  chapters: Chapter[];
  formattedChapters: ChapterData[];
  loading: boolean;
  error: string | null;
  currentChapter: Chapter | null;
  loadChapters: (episodeId: string) => Promise<void>;
  updatePosition: (position: number) => void;
  clearChapters: () => void;
}

const ChaptersContext = createContext<ChaptersContextType | undefined>(undefined);

export function ChaptersProvider({ children }: { children: ReactNode }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [formattedChapters, setFormattedChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);

  const { database } = useDatabase();
  const [repository, setRepository] = useState<ChapterRepository | null>(null);

  // Initialize repository
  useEffect(() => {
    if (database) {
      setRepository(new ChapterRepository(database));
    }
  }, [database]);

  // Subscribe to chapters for current episode
  useEffect(() => {
    if (!repository || !currentEpisodeId) {
      setChapters([]);
      setFormattedChapters([]);
      return;
    }

    console.log('ChaptersContext - Subscribing to chapters for episode:', currentEpisodeId);

    const subscription = repository.observeEpisodeChapters(currentEpisodeId).subscribe(
      (dbChapters) => {
        console.log('ChaptersContext - Chapters updated:', dbChapters.length);
        setChapters(dbChapters);

        // Format chapters with current position info
        if (dbChapters.length > 0) {
          const formatted = chapterService.formatChapters(dbChapters, currentPosition);
          setFormattedChapters(formatted);

          // Update current chapter
          const current = repository.findChapterAtPosition(dbChapters, currentPosition);
          setCurrentChapter(current);
        } else {
          setFormattedChapters([]);
          setCurrentChapter(null);
        }
      }
    );

    return () => {
      console.log('ChaptersContext - Unsubscribing from chapters');
      subscription.unsubscribe();
    };
  }, [repository, currentEpisodeId]);

  // Update formatted chapters when position changes
  useEffect(() => {
    if (chapters.length > 0) {
      const formatted = chapterService.formatChapters(chapters, currentPosition);
      setFormattedChapters(formatted);

      // Update current chapter
      const current = repository?.findChapterAtPosition(chapters, currentPosition) || null;
      setCurrentChapter(current);
    }
  }, [currentPosition, chapters, repository]);

  const loadChapters = useCallback(async (episodeId: string) => {
    if (!episodeId) {
      console.log('ChaptersContext - No episode ID provided');
      return;
    }

    // Skip loading for non-Podcast Club episodes (traditional podcast player)
    if (!isPodcastClubEpisode(episodeId)) {
      console.log('ChaptersContext - Skipping chapter load for non-Podcast Club episode:', episodeId);
      setCurrentEpisodeId(episodeId);
      setChapters([]);
      setFormattedChapters([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (episodeId === currentEpisodeId && chapters.length > 0) {
      console.log('ChaptersContext - Chapters already loaded for this episode');
      return;
    }

    setCurrentEpisodeId(episodeId);
    setLoading(true);
    setError(null);

    try {
      console.log('ChaptersContext - Loading chapters for episode:', episodeId);

      // Load chapters through service (which handles sync)
      const loadedChapters = await chapterService.loadChapters(episodeId);

      console.log('ChaptersContext - Loaded chapters:', loadedChapters.length);

      // The subscription will handle updating the state
    } catch (err) {
      console.error('Failed to load chapters:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chapters');
    } finally {
      setLoading(false);
    }
  }, [currentEpisodeId, chapters.length]);

  const updatePosition = (position: number) => {
    setCurrentPosition(position);
  };

  const clearChapters = () => {
    setChapters([]);
    setFormattedChapters([]);
    setCurrentChapter(null);
    setCurrentEpisodeId(null);
    setCurrentPosition(0);
    setError(null);
  };

  return (
    <ChaptersContext.Provider
      value={{
        chapters,
        formattedChapters,
        loading,
        error,
        currentChapter,
        loadChapters,
        updatePosition,
        clearChapters,
      }}
    >
      {children}
    </ChaptersContext.Provider>
  );
}

export function useChapters() {
  const context = useContext(ChaptersContext);
  if (context === undefined) {
    throw new Error('useChapters must be used within a ChaptersProvider');
  }
  return context;
}