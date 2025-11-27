import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationStarterRepository } from '@/data/repositories/conversation-starter.repository';
import { queryKeys } from './queryKeys';
import { useEffect, useRef } from 'react';

/**
 * Get stable repository instance
 */
function useStarterRepository() {
  const { database } = useDatabase();
  const repositoryRef = useRef<ConversationStarterRepository | null>(null);

  if (database && !repositoryRef.current) {
    repositoryRef.current = new ConversationStarterRepository(database);
  }

  return repositoryRef.current;
}

/**
 * Fetch all conversation starters for an episode with comment counts
 */
export function useConversationStarters(episodeId: string) {
  const repository = useStarterRepository();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.conversationStarters.list(episodeId),
    queryFn: async () => {
      if (!repository) throw new Error('Repository not initialized');

      // Sync from remote first
      await repository.syncFromRemote(episodeId);

      // Return starters with comment counts
      return await repository.getStartersWithCounts(episodeId);
    },
    enabled: !!repository && !!episodeId,
    staleTime: 5 * 60 * 1000, // 5 minutes - starters rarely change
  });

  // Set up reactive subscription for comment count updates
  useEffect(() => {
    if (!repository || !episodeId) return;

    const subscription = repository
      .observeStartersWithCounts(episodeId)
      .subscribe({
        next: () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.conversationStarters.list(episodeId),
          });
        },
        error: (err) => {
          console.error('[useConversationStarters] Observable error:', err);
        },
      });

    return () => subscription.unsubscribe();
  }, [repository, episodeId, queryClient]);

  return query;
}

/**
 * Fetch comments for a specific conversation starter
 */
export function useStarterComments(starterId: string) {
  const repository = useStarterRepository();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.conversationStarters.comments(starterId),
    queryFn: async () => {
      if (!repository) throw new Error('Repository not initialized');
      return await repository.getCommentsForStarter(starterId);
    },
    enabled: !!repository && !!starterId,
    staleTime: 30 * 1000, // 30 seconds - comments can change frequently
  });

  // Set up reactive subscription
  useEffect(() => {
    if (!repository || !starterId) return;

    const subscription = repository
      .observeCommentsForStarter(starterId)
      .subscribe({
        next: () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.conversationStarters.comments(starterId),
          });
        },
        error: (err) => {
          console.error('[useStarterComments] Observable error:', err);
        },
      });

    return () => subscription.unsubscribe();
  }, [repository, starterId, queryClient]);

  return query;
}

/**
 * Add a comment to a conversation starter
 */
export function useAddStarterComment() {
  const { user } = useAuth();
  const repository = useStarterRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      starterId,
      episodeId,
      content,
    }: {
      starterId: string;
      episodeId: string;
      content: string;
    }) => {
      if (!repository || !user) {
        throw new Error('Not authenticated or repository not initialized');
      }

      return await repository.addCommentToStarter(
        starterId,
        episodeId,
        user.id,
        content
      );
    },
    onMutate: async ({ starterId, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversationStarters.comments(starterId),
      });

      // Snapshot previous value for rollback
      const previousComments = queryClient.getQueryData(
        queryKeys.conversationStarters.comments(starterId)
      );

      // Optimistically add the new comment
      queryClient.setQueryData(
        queryKeys.conversationStarters.comments(starterId),
        (old: any[] | undefined) => {
          if (!old) return old;
          const optimisticComment = {
            id: 'temp-' + Date.now(),
            content,
            userId: user?.id,
            starterId,
            createdAt: new Date(),
            username: 'You',
            avatarUrl: null,
          };
          return [optimisticComment, ...old];
        }
      );

      return { previousComments };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(
          queryKeys.conversationStarters.comments(variables.starterId),
          context.previousComments
        );
      }
      console.error('[useAddStarterComment] Error:', err);
    },
    onSuccess: (_, { starterId, episodeId }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversationStarters.comments(starterId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversationStarters.list(episodeId),
      });
    },
  });
}
