/**
 * Convenience hooks for subscriptions store
 * These provide focused access to specific parts of the store
 */

import { useCallback } from 'react';
import {
  useSubscriptionsStore,
  selectSubscriptions,
  selectIsLoading,
  selectTrackedPodcasts,
  TrackedPodcast,
} from './subscriptionsStore';

// ============ State Selectors ============

/**
 * Get all subscribed podcasts
 */
export function useSubscriptions(): TrackedPodcast[] {
  return useSubscriptionsStore(selectSubscriptions);
}

/**
 * Get only tracked podcasts (subscribed + tracking enabled)
 */
export function useTrackedPodcasts(): TrackedPodcast[] {
  return useSubscriptionsStore(selectTrackedPodcasts);
}

/**
 * Get loading state
 */
export function useSubscriptionsLoading(): boolean {
  return useSubscriptionsStore(selectIsLoading);
}

// ============ Action Hooks ============

/**
 * Get the toggle tracking action
 */
export function useToggleTracking(): (podcastId: string) => void {
  return useSubscriptionsStore((state) => state.toggleTracking);
}

/**
 * Get the add subscription action
 */
export function useAddSubscription(): (podcast: TrackedPodcast) => void {
  return useSubscriptionsStore((state) => state.addSubscription);
}

/**
 * Get the remove subscription action
 */
export function useRemoveSubscription(): (podcastId: string) => void {
  return useSubscriptionsStore((state) => state.removeSubscription);
}

/**
 * Get the update subscription action
 */
export function useUpdateSubscription(): (podcastId: string, updates: Partial<TrackedPodcast>) => void {
  return useSubscriptionsStore((state) => state.updateSubscription);
}

// ============ Utility Hooks ============

/**
 * Check if a specific podcast is subscribed
 */
export function useIsSubscribed(podcastId: string): boolean {
  return useSubscriptionsStore(
    useCallback((state) => state.subscriptions.some(p => p.id === podcastId), [podcastId])
  );
}

/**
 * Check if a specific podcast is tracked
 */
export function useIsTracked(podcastId: string): boolean {
  return useSubscriptionsStore(
    useCallback((state) => {
      const podcast = state.subscriptions.find(p => p.id === podcastId);
      return podcast?.tracked ?? false;
    }, [podcastId])
  );
}

/**
 * Get a specific subscription by ID
 */
export function useSubscription(podcastId: string): TrackedPodcast | undefined {
  return useSubscriptionsStore(
    useCallback((state) => state.subscriptions.find(p => p.id === podcastId), [podcastId])
  );
}

// ============ Modal Helpers ============

/**
 * Get modal snapshot actions
 */
export function useModalSnapshot() {
  const savePreModalSnapshot = useSubscriptionsStore((state) => state.savePreModalSnapshot);
  const getPreModalSnapshot = useSubscriptionsStore((state) => state.getPreModalSnapshot);
  const clearPreModalSnapshot = useSubscriptionsStore((state) => state.clearPreModalSnapshot);

  return {
    savePreModalSnapshot,
    getPreModalSnapshot,
    clearPreModalSnapshot,
  };
}

// ============ Combined Hooks ============

/**
 * Get all subscription-related state and actions for a component
 */
export function useSubscriptionActions() {
  const addSubscription = useSubscriptionsStore((state) => state.addSubscription);
  const removeSubscription = useSubscriptionsStore((state) => state.removeSubscription);
  const updateSubscription = useSubscriptionsStore((state) => state.updateSubscription);
  const toggleTracking = useSubscriptionsStore((state) => state.toggleTracking);
  const setTracking = useSubscriptionsStore((state) => state.setTracking);

  return {
    addSubscription,
    removeSubscription,
    updateSubscription,
    toggleTracking,
    setTracking,
  };
}
