import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useDatabase } from './DatabaseContext';
import { useAuth } from './AuthContext';
import UserEpisodeProgress from '../models/UserEpisodeProgress';

interface EpisodeProgress {
  episodeId: string;
  currentPosition: number;
  totalDuration: number;
  completed: boolean;
  lastPlayedAt: number;
  progressPercentage: number;
}

interface PodcastStats {
  totalListeningTime: number;
  episodesStarted: number;
  episodesCompleted: number;
  currentStreak: number;
}

interface PodcastMetadataContextType {
  // Progress tracking
  getEpisodeProgress: (episodeId: string) => Promise<EpisodeProgress | null>;
  getMultipleEpisodeProgress: (episodeIds: string[]) => Promise<Map<string, EpisodeProgress>>;
  updateEpisodeProgress: (episodeId: string, position: number, duration: number) => Promise<void>;

  // Real-time progress for currently playing episode
  currentEpisodeProgress: Map<string, EpisodeProgress>;

  // Statistics
  podcastStats: PodcastStats | null;
  refreshStats: () => Promise<void>;

  // Listening history
  getRecentlyPlayed: (limit?: number) => Promise<EpisodeProgress[]>;
  markEpisodeCompleted: (episodeId: string) => Promise<void>;
}

const PodcastMetadataContext = createContext<PodcastMetadataContextType | undefined>(undefined);

export function PodcastMetadataProvider({ children }: { children: React.ReactNode }) {
  const { progressRepository } = useDatabase();
  const { user } = useAuth();

  const [currentEpisodeProgress, setCurrentEpisodeProgress] = useState<Map<string, EpisodeProgress>>(new Map());
  const [podcastStats, setPodcastStats] = useState<PodcastStats | null>(null);

  // Get progress for a single episode
  const getEpisodeProgress = useCallback(async (episodeId: string): Promise<EpisodeProgress | null> => {
    if (!user) return null;

    try {
      const progress = await progressRepository.getProgress(user.id, episodeId);
      if (!progress) return null;

      const progressPercentage = progress.totalDuration > 0
        ? Math.min(100, Math.round((progress.currentPosition / progress.totalDuration) * 100))
        : 0;

      return {
        episodeId: progress.episodeId,
        currentPosition: progress.currentPosition,
        totalDuration: progress.totalDuration,
        completed: progress.completed,
        lastPlayedAt: progress.lastPlayedAt,
        progressPercentage,
      };
    } catch (error) {
      console.error('Error getting episode progress:', error);
      return null;
    }
  }, [user, progressRepository]);

  // Get progress for multiple episodes (efficient batch loading)
  const getMultipleEpisodeProgress = useCallback(async (episodeIds: string[]): Promise<Map<string, EpisodeProgress>> => {
    const progressMap = new Map<string, EpisodeProgress>();

    if (!user || episodeIds.length === 0) return progressMap;

    try {
      // Batch fetch from database
      const progressRecords = await progressRepository.database
        .get<UserEpisodeProgress>('user_episode_progress')
        .query(
          Q.where('user_id', user.id),
          Q.where('episode_id', Q.oneOf(episodeIds))
        )
        .fetch();

      progressRecords.forEach(progress => {
        const progressPercentage = progress.totalDuration > 0
          ? Math.min(100, Math.round((progress.currentPosition / progress.totalDuration) * 100))
          : 0;

        progressMap.set(progress.episodeId, {
          episodeId: progress.episodeId,
          currentPosition: progress.currentPosition,
          totalDuration: progress.totalDuration,
          completed: progress.completed,
          lastPlayedAt: progress.lastPlayedAt,
          progressPercentage,
        });
      });

      // Update state for real-time updates
      setCurrentEpisodeProgress(progressMap);
    } catch (error) {
      console.error('Error getting multiple episode progress:', error);
    }

    return progressMap;
  }, [user, progressRepository]);

  // Update episode progress
  const updateEpisodeProgress = useCallback(async (episodeId: string, position: number, duration: number) => {
    if (!user) return;

    try {
      await progressRepository.saveProgress(user.id, episodeId, position, duration);

      // Update local state for real-time UI updates
      const progressPercentage = duration > 0
        ? Math.min(100, Math.round((position / duration) * 100))
        : 0;

      setCurrentEpisodeProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(episodeId, {
          episodeId,
          currentPosition: position,
          totalDuration: duration,
          completed: duration > 0 && position >= duration * 0.95,
          lastPlayedAt: Date.now(),
          progressPercentage,
        });
        return newMap;
      });

      // Refresh stats if episode was completed
      if (duration > 0 && position >= duration * 0.95) {
        refreshStats();
      }
    } catch (error) {
      console.error('Error updating episode progress:', error);
    }
  }, [user, progressRepository]);

  // Get recently played episodes
  const getRecentlyPlayed = useCallback(async (limit: number = 10): Promise<EpisodeProgress[]> => {
    if (!user) return [];

    try {
      const recentProgress = await progressRepository.database
        .get<UserEpisodeProgress>('user_episode_progress')
        .query(
          Q.where('user_id', user.id),
          Q.sortBy('last_played_at', Q.desc),
          Q.take(limit)
        )
        .fetch();

      return recentProgress.map(progress => ({
        episodeId: progress.episodeId,
        currentPosition: progress.currentPosition,
        totalDuration: progress.totalDuration,
        completed: progress.completed,
        lastPlayedAt: progress.lastPlayedAt,
        progressPercentage: progress.totalDuration > 0
          ? Math.min(100, Math.round((progress.currentPosition / progress.totalDuration) * 100))
          : 0,
      }));
    } catch (error) {
      console.error('Error getting recently played:', error);
      return [];
    }
  }, [user, progressRepository]);

  // Mark episode as completed
  const markEpisodeCompleted = useCallback(async (episodeId: string) => {
    if (!user) return;

    try {
      const progress = await progressRepository.getProgress(user.id, episodeId);
      if (progress) {
        await progressRepository.database.write(async () => {
          await progress.update((p) => {
            p.completed = true;
            p.currentPosition = p.totalDuration;
            p.needsSync = true;
          });
        });

        refreshStats();
      }
    } catch (error) {
      console.error('Error marking episode completed:', error);
    }
  }, [user, progressRepository]);

  // Calculate and refresh stats
  const refreshStats = useCallback(async () => {
    if (!user) return;

    try {
      const allProgress = await progressRepository.database
        .get<UserEpisodeProgress>('user_episode_progress')
        .query(Q.where('user_id', user.id))
        .fetch();

      const stats: PodcastStats = {
        totalListeningTime: allProgress.reduce((sum, p) => sum + p.currentPosition, 0),
        episodesStarted: allProgress.length,
        episodesCompleted: allProgress.filter(p => p.completed).length,
        currentStreak: calculateStreak(allProgress),
      };

      setPodcastStats(stats);
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  }, [user, progressRepository]);

  // Helper function to calculate listening streak
  const calculateStreak = (progressRecords: UserEpisodeProgress[]): number => {
    if (progressRecords.length === 0) return 0;

    // Sort by last played date
    const sorted = progressRecords
      .filter(p => p.lastPlayedAt)
      .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);

    if (sorted.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sorted.length; i++) {
      const playedDate = new Date(sorted[i].lastPlayedAt);
      playedDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((today.getTime() - playedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  // Load initial stats when user changes
  useEffect(() => {
    if (user) {
      refreshStats();
    }
  }, [user, refreshStats]);

  const value: PodcastMetadataContextType = {
    getEpisodeProgress,
    getMultipleEpisodeProgress,
    updateEpisodeProgress,
    currentEpisodeProgress,
    podcastStats,
    refreshStats,
    getRecentlyPlayed,
    markEpisodeCompleted,
  };

  return (
    <PodcastMetadataContext.Provider value={value}>
      {children}
    </PodcastMetadataContext.Provider>
  );
}

export function usePodcastMetadata() {
  const context = useContext(PodcastMetadataContext);
  if (context === undefined) {
    throw new Error('usePodcastMetadata must be used within a PodcastMetadataProvider');
  }
  return context;
}

// Import Q from WatermelonDB
import { Q } from '@nozbe/watermelondb';