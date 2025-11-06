import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';
import { useEffect, useMemo } from 'react';
import type Profile from '@/data/models/profile.model';

/**
 * Fetch current user's profile with real-time updates
 */
export function useCurrentProfile() {
  const { profileRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up WatermelonDB observable subscription
  useEffect(() => {
    if (!user?.id || !profileRepository) return;

    console.log('[useCurrentProfile] Setting up observable subscription for user:', user.id);

    const subscription = profileRepository
      .observeQuery([{ column: 'user_id', value: user.id }])
      .subscribe((profiles) => {
        console.log('🔔 Profile changed, invalidating cache');
        queryClient.invalidateQueries({
          queryKey: queryKeys.profile.current()
        });
      });

    return () => {
      console.log('[useCurrentProfile] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [user?.id, profileRepository, queryClient]);

  return useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: async () => {
      if (!user?.id) throw new Error('No authenticated user');

      console.log('[useCurrentProfile] Fetching profile from database');

      // Sync from remote if needed (respects TTL in repository)
      await profileRepository.syncCurrentUserProfile();

      // Return local data
      return profileRepository.getCurrentUserProfile();
    },
    enabled: !!user?.id && !!profileRepository,
    staleTime: 5 * 60 * 1000, // 5 minutes - profile changes infrequently
  });
}

/**
 * Fetch any user's profile by ID with real-time updates
 */
export function useProfile(userId: string | null) {
  const { profileRepository } = useDatabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !profileRepository) return;

    console.log('[useProfile] Setting up observable subscription for user:', userId);

    const subscription = profileRepository
      .observeQuery([{ column: 'user_id', value: userId }])
      .subscribe((profiles) => {
        console.log('🔔 Profile changed for user:', userId);
        queryClient.invalidateQueries({
          queryKey: queryKeys.profile.user(userId)
        });
      });

    return () => {
      console.log('[useProfile] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [userId, profileRepository, queryClient]);

  return useQuery({
    queryKey: queryKeys.profile.user(userId!),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      console.log('[useProfile] Fetching profile for user:', userId);

      return profileRepository.findByUserId(userId);
    },
    enabled: !!userId && !!profileRepository,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update profile mutation with optimistic updates
 */
export function useUpdateProfile() {
  const { profileRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      username,
      avatarUrl,
      firstName,
      lastName,
    }: {
      username: string | null;
      avatarUrl?: string;
      firstName?: string | null;
      lastName?: string | null;
    }) => {
      if (!user?.id) throw new Error('No authenticated user');

      console.log('[useUpdateProfile] Updating profile:', { username, firstName, lastName });

      return profileRepository.updateProfile(
        user.id,
        username,
        avatarUrl || null,
        firstName,
        lastName
      );
    },
    onMutate: async (updates) => {
      console.log('[useUpdateProfile] Optimistic update starting');

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.profile.current()
      });

      // Snapshot previous value
      const previous = queryClient.getQueryData<Profile | null>(
        queryKeys.profile.current()
      );

      // Optimistically update
      if (previous) {
        queryClient.setQueryData<Profile | null>(
          queryKeys.profile.current(),
          {
            ...previous,
            username: updates.username ?? previous.username,
            avatarUrl: updates.avatarUrl ?? previous.avatarUrl,
            firstName: updates.firstName ?? previous.firstName,
            lastName: updates.lastName ?? previous.lastName,
          }
        );
      }

      return { previous };
    },
    onError: (err, updates, context) => {
      console.error('[useUpdateProfile] Error updating profile, rolling back:', err);

      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.profile.current(),
          context.previous
        );
      }
    },
    onSuccess: (data) => {
      console.log('[useUpdateProfile] Profile updated successfully');

      // Invalidate to refetch and confirm optimistic update
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.current()
      });

      // Also invalidate the user-specific query if it exists
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.profile.user(user.id)
        });
      }
    },
  });
}

/**
 * Manually refresh profile (force sync from remote)
 */
export function useRefreshProfile() {
  const { profileRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No authenticated user');

      console.log('[useRefreshProfile] Force refreshing profile from remote');

      // Force sync from remote
      await profileRepository.syncCurrentUserProfile(true);

      // Get fresh data
      return profileRepository.getCurrentUserProfile();
    },
    onSuccess: () => {
      console.log('[useRefreshProfile] Profile refreshed successfully');

      // Invalidate cache to trigger refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.current()
      });
    },
  });
}

/**
 * Helper hook to get user initials from profile
 */
export function useProfileInitials() {
  const { data: profile } = useCurrentProfile();

  return useMemo(() => {
    // Use firstName and lastName if available
    if (profile?.firstName || profile?.lastName) {
      const firstInitial = profile.firstName ? profile.firstName[0].toUpperCase() : '';
      const lastInitial = profile.lastName ? profile.lastName[0].toUpperCase() : '';
      return (firstInitial + lastInitial) || 'U';
    }

    // Fallback to username
    if (!profile?.username) return 'U';

    return profile.username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [profile]);
}
