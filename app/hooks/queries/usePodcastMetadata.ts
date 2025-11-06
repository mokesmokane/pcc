import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';
import { useEffect, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import type UserEpisodeProgress from '@/models/UserEpisodeProgress';

export interface EpisodeProgress {
  episodeId: string;
  currentPosition: number;
  totalDuration: number;
  completed: boolean;
  lastPlayedAt: number;
  progressPercentage: number;
}

export interface PodcastStats {
  totalListeningTime: number;
  episodesStarted: number;
  episodesCompleted: number;
  currentStreak: number;
}

/**
 * Fetch progress for a single episode
 */
export function useEpisodeProgress(episodeId: string | null) {
  const { progressRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up WatermelonDB observable subscription
  useEffect(() => {
    if (!episodeId || !user?.id || !progressRepository) return;

    const subscription = progressRepository
      .observeProgress(user.id, episodeId)
      .subscribe(() => {
        console.log('🔔 Episode progress changed, invalidating cache:', episodeId);
        queryClient.invalidateQueries({
          queryKey: queryKeys.podcastMetadata.progress(episodeId, user.id),
        });
      });

    return () => subscription.unsubscribe();
  }, [episodeId, user?.id, progressRepository, queryClient]);

  return useQuery({
    queryKey: queryKeys.podcastMetadata.progress(episodeId!, user?.id!),
    queryFn: async (): Promise<EpisodeProgress | null> => {
      if (!user?.id || !episodeId) return null;

      const progress = await progressRepository.getProgress(user.id, episodeId);
      if (!progress) return null;

      const progressPercentage =
        progress.totalDuration > 0
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
    },
    enabled: !!episodeId && !!user?.id,
    staleTime: 30 * 1000, // 30 seconds (progress updates frequently)
  });
}

/**
 * Fetch progress for multiple episodes (batch loading)
 */
export function useMultipleEpisodeProgress(episodeIds: string[]) {
  const { progressRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up observable for any progress changes
  useEffect(() => {
    if (episodeIds.length === 0 || !user?.id || !progressRepository) return;

    // Subscribe to changes for all episodes in the list
    const subscriptions = episodeIds.map((episodeId) =>
      progressRepository.observeProgress(user.id, episodeId).subscribe(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.podcastMetadata.multipleProgress(episodeIds, user.id),
        });
      })
    );

    return () => subscriptions.forEach((sub) => sub.unsubscribe());
  }, [episodeIds, user?.id, progressRepository, queryClient]);

  return useQuery({
    queryKey: queryKeys.podcastMetadata.multipleProgress(episodeIds, user?.id!),
    queryFn: async (): Promise<Map<string, EpisodeProgress>> => {
      const progressMap = new Map<string, EpisodeProgress>();

      if (!user?.id || episodeIds.length === 0) return progressMap;

      try {
        // Batch fetch from database
        const progressRecords = await progressRepository.database
          .get<UserEpisodeProgress>('user_episode_progress')
          .query(Q.where('user_id', user.id), Q.where('episode_id', Q.oneOf(episodeIds)))
          .fetch();

        progressRecords.forEach((progress) => {
          const progressPercentage =
            progress.totalDuration > 0
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
      } catch (error) {
        console.error('Error getting multiple episode progress:', error);
      }

      return progressMap;
    },
    enabled: !!user?.id && episodeIds.length > 0,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch recently played episodes
 */
export function useRecentlyPlayed(limit: number = 10) {
  const { progressRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Observe all progress changes to invalidate history
  useEffect(() => {
    if (!user?.id || !progressRepository) return;

    const subscription = progressRepository
      .observeAllProgress(user.id)
      .subscribe(() => {
        console.log('🔔 Progress history changed, invalidating cache');
        queryClient.invalidateQueries({
          queryKey: queryKeys.podcastMetadata.history(user.id, limit),
        });
      });

    return () => subscription.unsubscribe();
  }, [user?.id, limit, progressRepository, queryClient]);

  return useQuery({
    queryKey: queryKeys.podcastMetadata.history(user?.id!, limit),
    queryFn: async (): Promise<EpisodeProgress[]> => {
      if (!user?.id) return [];

      try {
        const recentProgress = await progressRepository.database
          .get<UserEpisodeProgress>('user_episode_progress')
          .query(
            Q.where('user_id', user.id),
            Q.sortBy('last_played_at', Q.desc),
            Q.take(limit)
          )
          .fetch();

        return recentProgress.map((progress) => ({
          episodeId: progress.episodeId,
          currentPosition: progress.currentPosition,
          totalDuration: progress.totalDuration,
          completed: progress.completed,
          lastPlayedAt: progress.lastPlayedAt,
          progressPercentage:
            progress.totalDuration > 0
              ? Math.min(100, Math.round((progress.currentPosition / progress.totalDuration) * 100))
              : 0,
        }));
      } catch (error) {
        console.error('Error getting recently played:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Fetch podcast listening statistics
 */
export function usePodcastStats() {
  const { progressRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Observe all progress changes to update stats
  useEffect(() => {
    if (!user?.id || !progressRepository) return;

    const subscription = progressRepository
      .observeAllProgress(user.id)
      .subscribe(() => {
        console.log('🔔 Progress changed, invalidating stats');
        queryClient.invalidateQueries({
          queryKey: queryKeys.podcastMetadata.stats(user.id),
        });
      });

    return () => subscription.unsubscribe();
  }, [user?.id, progressRepository, queryClient]);

  return useQuery({
    queryKey: queryKeys.podcastMetadata.stats(user?.id!),
    queryFn: async (): Promise<PodcastStats | null> => {
      if (!user?.id) return null;

      try {
        const allProgress = await progressRepository.database
          .get<UserEpisodeProgress>('user_episode_progress')
          .query(Q.where('user_id', user.id))
          .fetch();

        const stats: PodcastStats = {
          totalListeningTime: allProgress.reduce((sum, p) => sum + p.currentPosition, 0),
          episodesStarted: allProgress.length,
          episodesCompleted: allProgress.filter((p) => p.completed).length,
          currentStreak: calculateStreak(allProgress),
        };

        return stats;
      } catch (error) {
        console.error('Error calculating stats:', error);
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Update episode progress mutation
 */
export function useUpdateEpisodeProgress() {
  const { progressRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      episodeId,
      position,
      duration,
    }: {
      episodeId: string;
      position: number;
      duration: number;
    }) => {
      if (!user?.id) throw new Error('No authenticated user');

      return progressRepository.saveProgress(user.id, episodeId, position, duration);
    },
    onMutate: async ({ episodeId, position, duration }) => {
      if (!user?.id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.podcastMetadata.progress(episodeId, user.id),
      });

      // Snapshot previous value
      const previous = queryClient.getQueryData<EpisodeProgress>(
        queryKeys.podcastMetadata.progress(episodeId, user.id)
      );

      // Optimistically update
      const progressPercentage =
        duration > 0 ? Math.min(100, Math.round((position / duration) * 100)) : 0;

      queryClient.setQueryData(queryKeys.podcastMetadata.progress(episodeId, user.id), {
        episodeId,
        currentPosition: position,
        totalDuration: duration,
        completed: duration > 0 && position >= duration * 0.95,
        lastPlayedAt: Date.now(),
        progressPercentage,
      });

      return { previous };
    },
    onError: (err, variables, context) => {
      if (!user?.id) return;

      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.podcastMetadata.progress(variables.episodeId, user.id),
          context.previous
        );
      }
    },
    onSettled: (data, error, variables) => {
      if (!user?.id) return;

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcastMetadata.progress(variables.episodeId, user.id),
      });

      // If episode was completed, also invalidate stats and history
      if (
        variables.duration > 0 &&
        variables.position >= variables.duration * 0.95
      ) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.podcastMetadata.stats(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.podcastMetadata.history(user.id),
        });
      }
    },
  });
}

/**
 * Mark episode as completed mutation
 */
export function useMarkEpisodeCompleted() {
  const { progressRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (episodeId: string) => {
      if (!user?.id) throw new Error('No authenticated user');

      const progress = await progressRepository.getProgress(user.id, episodeId);
      if (!progress) throw new Error('Progress not found');

      await progressRepository.database.write(async function markEpisodeAsCompleted() {
        await progress.update((p) => {
          p.completed = true;
          p.currentPosition = p.totalDuration;
          p.needsSync = true;
        });
      });
    },
    onSuccess: (data, episodeId) => {
      if (!user?.id) return;

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcastMetadata.progress(episodeId, user.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcastMetadata.stats(user.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcastMetadata.history(user.id),
      });
    },
  });
}

/**
 * Flush pending progress syncs mutation
 */
export function useFlushProgressSync() {
  const { progressRepository } = useDatabase();

  return useMutation({
    mutationFn: async () => {
      return progressRepository.flushPendingSyncs();
    },
  });
}

// Helper function to calculate listening streak
function calculateStreak(progressRecords: UserEpisodeProgress[]): number {
  if (progressRecords.length === 0) return 0;

  // Sort by last played date
  const sorted = progressRecords
    .filter((p) => p.lastPlayedAt)
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);

  if (sorted.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const playedDate = new Date(sorted[i].lastPlayedAt);
    playedDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - playedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === streak) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
