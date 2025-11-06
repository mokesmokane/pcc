import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TranscriptSegmentRepository } from '../data/repositories/transcript-segment.repository';
import type TranscriptSegment from '../data/models/transcript-segment.model';
import type { TranscriptDisplay} from '../services/transcript.service';
import { TranscriptSegmentData, transcriptService } from '../services/transcript.service';
import { useDatabase } from './DatabaseContext';
import { isPodcastClubEpisode } from '../utils/episodeUtils';

interface TranscriptContextType {
  segments: TranscriptSegment[];
  loading: boolean;
  error: string | null;
  currentSegment: TranscriptSegment | null;
  transcriptDisplay: TranscriptDisplay | null;
  loadTranscript: (episodeId: string) => Promise<void>;
  updatePosition: (position: number) => void;
  clearTranscript: () => void;
}

const TranscriptContext = createContext<TranscriptContextType | undefined>(undefined);

export function TranscriptProvider({ children }: { children: ReactNode }) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [currentSegment, setCurrentSegment] = useState<TranscriptSegment | null>(null);
  const [transcriptDisplay, setTranscriptDisplay] = useState<TranscriptDisplay | null>(null);

  const { database } = useDatabase();
  const [repository, setRepository] = useState<TranscriptSegmentRepository | null>(null);

  // Initialize repository
  useEffect(() => {
    if (database) {
      setRepository(new TranscriptSegmentRepository(database));
    }
  }, [database]);

  // Subscribe to segments for current episode
  useEffect(() => {
    if (!repository || !currentEpisodeId) {
      setSegments([]);
      return;
    }

    const subscription = repository.observeEpisodeSegments(currentEpisodeId).subscribe(
      (dbSegments) => {
        setSegments(dbSegments);

        // Update display when segments change
        if (dbSegments.length > 0) {
          const display = transcriptService.formatTranscriptDisplay(dbSegments, currentPosition);
          setTranscriptDisplay(display);

          // Update current segment
          const current = repository.findSegmentAtPosition(dbSegments, currentPosition);
          setCurrentSegment(current);
        } else {
          setTranscriptDisplay(null);
          setCurrentSegment(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [repository, currentEpisodeId, currentPosition]);

  const loadTranscript = useCallback(async (episodeId: string) => {
    if (!episodeId) {
      return;
    }

    // Skip loading for non-Podcast Club episodes (traditional podcast player)
    if (!isPodcastClubEpisode(episodeId)) {
      console.log('TranscriptContext - Skipping transcript load for non-Podcast Club episode:', episodeId);
      setCurrentEpisodeId(episodeId);
      setSegments([]);
      setTranscriptDisplay(null);
      setCurrentSegment(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (episodeId === currentEpisodeId && segments.length > 0) {
      return;
    }

    setCurrentEpisodeId(episodeId);
    setLoading(true);
    setError(null);

    try {
      // Load transcript through service (which handles sync)
      const loadedSegments = await transcriptService.loadTranscript(episodeId);

      // The subscription will handle updating the state
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transcript');
      setSegments([]);
      setTranscriptDisplay(null);
      setCurrentSegment(null);
    } finally {
      setLoading(false);
    }
  }, [currentEpisodeId, segments.length]);

  const updatePosition = (position: number) => {
    setCurrentPosition(position);

    if (segments.length > 0) {
      // Update display based on new position
      const display = transcriptService.formatTranscriptDisplay(segments, position);
      setTranscriptDisplay(display);

      // Update current segment
      if (repository) {
        const current = repository.findSegmentAtPosition(segments, position);
        setCurrentSegment(current);
      }
    }
  };

  const clearTranscript = () => {
    setCurrentEpisodeId(null);
    setSegments([]);
    setTranscriptDisplay(null);
    setCurrentSegment(null);
    setCurrentPosition(0);
    setError(null);
  };

  const value: TranscriptContextType = {
    segments,
    loading,
    error,
    currentSegment,
    transcriptDisplay,
    loadTranscript,
    updatePosition,
    clearTranscript,
  };

  return (
    <TranscriptContext.Provider value={value}>
      {children}
    </TranscriptContext.Provider>
  );
}

export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (context === undefined) {
    throw new Error('useTranscript must be used within a TranscriptProvider');
  }
  return context;
}