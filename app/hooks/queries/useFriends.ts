import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';
import { friendsService, Friend } from '@/services/friends.service';
import { useMemo } from 'react';

/**
 * Fetch friend list for current user
 */
export function useFriends() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.friends.list(),
    queryFn: async () => {
      if (!user?.id) {
        console.log('[useFriends] No user, returning empty array');
        return [];
      }

      console.log('[useFriends] Fetching friends');
      return friendsService.getFriends();
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - friends change less often
  });
}

/**
 * Get friend IDs as a Set for quick lookup
 */
export function useFriendIds() {
  const { data: friends = [] } = useFriends();

  return useMemo(() => {
    return new Set(friends.map(f => f.userId));
  }, [friends]);
}

/**
 * Check if a user is a friend
 */
export function useIsFriend(userId: string | null) {
  const friendIds = useFriendIds();

  return useMemo(() => {
    if (!userId) return false;
    return friendIds.has(userId);
  }, [userId, friendIds]);
}

/**
 * Match contacts mutation
 */
export function useMatchContacts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No authenticated user');

      console.log('[useMatchContacts] Matching contacts with users');
      return friendsService.matchContactsWithUsers();
    },
    onSuccess: (friends) => {
      console.log('[useMatchContacts] Found', friends.length, 'friends');

      // Update the friends list cache
      queryClient.setQueryData<Friend[]>(
        queryKeys.friends.list(),
        friends
      );

      // Also invalidate to trigger any dependent queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.list()
      });
    },
    onError: (error) => {
      console.error('[useMatchContacts] Error matching contacts:', error);
    },
  });
}

/**
 * Refresh friends mutation (force reload from contacts)
 */
export function useRefreshFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No authenticated user');

      console.log('[useRefreshFriends] Refreshing friends from contacts');
      return friendsService.refreshFriends();
    },
    onSuccess: (friends) => {
      console.log('[useRefreshFriends] Refreshed', friends.length, 'friends');

      // Update the friends list cache
      queryClient.setQueryData<Friend[]>(
        queryKeys.friends.list(),
        friends
      );

      // Invalidate to trigger refetch in components
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.list()
      });
    },
    onError: (error) => {
      console.error('[useRefreshFriends] Error refreshing friends:', error);
    },
  });
}

/**
 * Clear friends cache
 */
export function useClearFriendsCache() {
  const queryClient = useQueryClient();

  return () => {
    console.log('[useClearFriendsCache] Clearing friends cache');
    friendsService.clearCache();
    queryClient.invalidateQueries({
      queryKey: queryKeys.friends.list()
    });
  };
}
