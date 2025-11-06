import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { DiscussionService } from '@/services/discussion.service';
import { DiscussionRepository } from '@/data/repositories/discussion.repository';
import { queryKeys } from './queryKeys';
import { useEffect, useRef } from 'react';

/**
 * Get stable service instances (recreate pattern from contexts)
 */
function useDiscussionServices() {
  const { database } = useDatabase();
  const serviceRef = useRef<DiscussionService | null>(null);
  const repositoryRef = useRef<DiscussionRepository | null>(null);

  if (database && !serviceRef.current) {
    serviceRef.current = new DiscussionService(database);
    repositoryRef.current = new DiscussionRepository(database);
  }

  return {
    discussionService: serviceRef.current,
    discussionRepository: repositoryRef.current,
  };
}

/**
 * Fetch all discussion questions for an episode
 */
export function useDiscussionQuestions(episodeId: string) {
  const { discussionService } = useDiscussionServices();

  return useQuery({
    queryKey: queryKeys.discussion.questions(episodeId),
    queryFn: async () => {
      if (!discussionService) throw new Error('Service not initialized');
      return await discussionService.loadQuestionsForEpisode(episodeId);
    },
    enabled: !!discussionService && !!episodeId,
    staleTime: 5 * 60 * 1000, // 5 minutes - questions rarely change
  });
}

/**
 * Fetch user's responses for an episode with real-time updates
 */
export function useUserDiscussionResponses(episodeId: string) {
  const { user } = useAuth();
  const { discussionRepository } = useDiscussionServices();
  const queryClient = useQueryClient();

  // Base query - fetches once
  const query = useQuery({
    queryKey: queryKeys.discussion.responses(episodeId, user?.id || ''),
    queryFn: async () => {
      if (!discussionRepository || !user) return {};

      // Sync from remote first
      await discussionRepository.syncUserResponsesFromRemote(user.id, episodeId);

      // Get all questions for this episode
      const questions = await discussionRepository.getQuestionsForEpisode(episodeId);

      // Build responses map
      const responsesMap: Record<string, { agreed: number[]; disagreed: number[] }> = {};
      for (const { question } of questions) {
        const responses = await discussionRepository.getUserResponses(user.id, question.id);
        responsesMap[question.id] = responses;
      }

      return responsesMap;
    },
    enabled: !!discussionRepository && !!user && !!episodeId,
    staleTime: 30 * 1000, // 30 seconds - responses can change
  });

  // Set up real-time subscription to invalidate on changes
  useEffect(() => {
    if (!discussionRepository || !user || !episodeId) return;

    console.log('[useUserDiscussionResponses] Setting up observable subscription');

    // Debounce invalidation to avoid re-renders during rapid swipes
    let debounceTimer: NodeJS.Timeout | null = null;

    const subscription = discussionRepository
      .observeUserResponsesForEpisode(user.id, episodeId)
      .subscribe({
        next: (responsesMap) => {
          console.log('[useUserDiscussionResponses] Observable fired! Will invalidate after debounce');

          // Clear existing timer
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          // Debounce invalidation by 300ms to allow animations to complete
          debounceTimer = setTimeout(() => {
            console.log('[useUserDiscussionResponses] Debounce complete, invalidating query');
            queryClient.invalidateQueries({
              queryKey: queryKeys.discussion.responses(episodeId, user.id)
            });
          }, 300);
        },
        error: (err) => {
          console.error('[useUserDiscussionResponses] Observable error:', err);
        },
      });

    return () => {
      console.log('[useUserDiscussionResponses] Cleaning up subscription');
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      subscription.unsubscribe();
    };
  }, [discussionRepository, user, episodeId, queryClient]);

  return query;
}

/**
 * Get poll progress (derived from questions + responses)
 */
export function usePollProgress(episodeId: string) {
  const { user } = useAuth();
  const { discussionService } = useDiscussionServices();

  return useQuery({
    queryKey: queryKeys.discussion.progress(episodeId, user?.id || ''),
    queryFn: async () => {
      if (!discussionService || !user) {
        return { progress: 0, isCompleted: false, totalQuestions: 0, completedCount: 0 };
      }

      return await discussionService.getPollProgress(user.id, episodeId);
    },
    enabled: !!discussionService && !!user && !!episodeId,
    staleTime: 5 * 1000, // 5 seconds - progress is critical UI state that needs to be fresh
  });
}

/**
 * Get unanswered questions for an episode
 */
export function useUnansweredQuestions(episodeId: string) {
  const { user } = useAuth();
  const { discussionService } = useDiscussionServices();

  return useQuery({
    queryKey: queryKeys.discussion.unanswered(episodeId, user?.id || ''),
    queryFn: async () => {
      if (!discussionService || !user) return [];
      return await discussionService.getUnansweredQuestions(user.id, episodeId);
    },
    enabled: !!discussionService && !!user && !!episodeId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get statistics for a specific question
 */
export function useQuestionStats(questionId: string) {
  const { discussionService } = useDiscussionServices();

  return useQuery({
    queryKey: queryKeys.discussion.questionStats(questionId),
    queryFn: async () => {
      if (!discussionService) return [];
      return await discussionService.getQuestionStats(questionId);
    },
    enabled: !!discussionService && !!questionId,
    staleTime: 2 * 60 * 1000, // 2 minutes - stats change more frequently
  });
}

/**
 * Save user's response to a question
 */
export function useSaveDiscussionResponse() {
  const { user } = useAuth();
  const { discussionService } = useDiscussionServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      questionId,
      episodeId,
      agreedValues,
      disagreedValues,
    }: {
      questionId: string;
      episodeId: string;
      agreedValues: number[];
      disagreedValues: number[];
    }) => {
      if (!discussionService || !user) {
        throw new Error('Not authenticated or service not initialized');
      }

      console.log('[useSaveDiscussionResponse] Saving response:', {
        questionId,
        agreedValues,
        disagreedValues,
      });

      const allOptionValues = [...new Set([...agreedValues, ...disagreedValues])];

      // Save locally (fast, doesn't block UI)
      const responseIds = await discussionService.saveAllResponses(user.id, questionId, agreedValues, allOptionValues);

      console.log('[useSaveDiscussionResponse] Saved locally, will sync to Supabase in background');

      // Return response IDs for background sync
      return { responseIds };
    },
    onMutate: async ({ questionId, episodeId, agreedValues, disagreedValues }) => {
      // Optimistic update: immediately update the cache
      await queryClient.cancelQueries({
        queryKey: queryKeys.discussion.responses(episodeId, user?.id || '')
      });

      const previousResponses = queryClient.getQueryData(
        queryKeys.discussion.responses(episodeId, user?.id || '')
      );

      // Optimistically update responses
      queryClient.setQueryData(
        queryKeys.discussion.responses(episodeId, user?.id || ''),
        (old: Record<string, { agreed: number[]; disagreed: number[] }> | undefined) => {
          if (!old) return old;

          return {
            ...old,
            [questionId]: {
              agreed: agreedValues,
              disagreed: disagreedValues,
            },
          };
        }
      );

      return { previousResponses };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousResponses) {
        queryClient.setQueryData(
          queryKeys.discussion.responses(variables.episodeId, user?.id || ''),
          context.previousResponses
        );
      }
      console.error('[useSaveDiscussionResponse] Error saving response:', err);
    },
    onSuccess: (data, { episodeId }) => {
      console.log('[useSaveDiscussionResponse] Response saved locally successfully');

      // Trigger background sync to Supabase (non-blocking)
      if (data?.responseIds && discussionService) {
        console.log('[useSaveDiscussionResponse] Starting background sync to Supabase');
        discussionService.syncResponsesToRemote(data.responseIds).catch((error) => {
          console.error('[useSaveDiscussionResponse] Background sync failed:', error);
          // TODO: Could implement retry logic or show user notification
        });
      }

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussion.responses(episodeId, user?.id || '')
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussion.progress(episodeId, user?.id || '')
      });

      // DON'T invalidate unanswered here! It will cause the topics array to update
      // while user is viewing results. Let the component invalidate it manually
      // when user clicks "Next Question"
    },
  });
}

/**
 * Handle moving to next question (invalidates unanswered query)
 *
 * This is separate from the save mutation to control timing:
 * - We don't want to invalidate immediately after save (topics would change while viewing results)
 * - We only invalidate when user explicitly moves to next question
 */
export function useNextQuestion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return (episodeId: string) => {
    console.log('[useNextQuestion] Invalidating unanswered questions for next render');

    if (user) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussion.unanswered(episodeId, user.id)
      });
    }
  };
}

/**
 * Clear user's responses for a question
 */
export function useClearDiscussionResponses() {
  const { user } = useAuth();
  const { discussionService } = useDiscussionServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      questionId,
      episodeId,
    }: {
      questionId: string;
      episodeId: string;
    }) => {
      if (!discussionService || !user) {
        throw new Error('Not authenticated or service not initialized');
      }

      console.log('[useClearDiscussionResponses] Clearing responses for question:', questionId);
      await discussionService.clearUserResponses(user.id, questionId);
      discussionService.invalidateSyncCache(episodeId);
    },
    onMutate: async ({ questionId, episodeId }) => {
      // Optimistically update caches to make UI feel instant
      await queryClient.cancelQueries({
        queryKey: queryKeys.discussion.responses(episodeId, user?.id || '')
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.discussion.progress(episodeId, user?.id || '')
      });

      // Store previous values for rollback
      const previousResponses = queryClient.getQueryData(
        queryKeys.discussion.responses(episodeId, user?.id || '')
      );
      const previousProgress = queryClient.getQueryData(
        queryKeys.discussion.progress(episodeId, user?.id || '')
      );

      // Optimistically remove this question's responses
      queryClient.setQueryData(
        queryKeys.discussion.responses(episodeId, user?.id || ''),
        (old: Record<string, { agreed: number[]; disagreed: number[] }> | undefined) => {
          if (!old) return old;
          const newResponses = { ...old };
          delete newResponses[questionId];
          return newResponses;
        }
      );

      // Optimistically recalculate progress (decrement completed count)
      queryClient.setQueryData(
        queryKeys.discussion.progress(episodeId, user?.id || ''),
        (old: { progress: number; isCompleted: boolean; totalQuestions: number; completedCount: number } | undefined) => {
          if (!old) return old;
          const newCompletedCount = Math.max(0, old.completedCount - 1);
          const newProgress = old.totalQuestions > 0 ? (newCompletedCount / old.totalQuestions) * 100 : 0;
          return {
            ...old,
            completedCount: newCompletedCount,
            progress: newProgress,
            isCompleted: newCompletedCount === old.totalQuestions,
          };
        }
      );

      return { previousResponses, previousProgress };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousResponses) {
        queryClient.setQueryData(
          queryKeys.discussion.responses(variables.episodeId, user?.id || ''),
          context.previousResponses
        );
      }
      if (context?.previousProgress) {
        queryClient.setQueryData(
          queryKeys.discussion.progress(variables.episodeId, user?.id || ''),
          context.previousProgress
        );
      }
      console.error('[useClearDiscussionResponses] Error clearing responses:', err);
    },
    onSuccess: (_, { episodeId }) => {
      console.log('[useClearDiscussionResponses] Responses cleared successfully');

      // Invalidate all related queries to refetch from database and confirm optimistic updates
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussion.responses(episodeId, user?.id || '')
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussion.progress(episodeId, user?.id || '')
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussion.unanswered(episodeId, user?.id || '')
      });
    },
  });
}
