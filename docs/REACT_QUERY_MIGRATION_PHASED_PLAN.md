# React Query Migration: Phased Implementation Plan

**Project:** Podcast Club App
**Created:** 2025-01-15
**Status:** Ready to Execute
**Estimated Duration:** 5 weeks (25 working days)
**Related Docs:**
- [State Management Migration Plan](./STATE_MANAGEMENT_MIGRATION_PLAN.md)
- [Realtime Integration Guide](./REALTIME_WITH_REACT_QUERY.md)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Migration Status](#migration-status)
3. [Phase 0: Preparation (2 days)](#phase-0-preparation-2-days)
4. [Phase 1: Audio State → Zustand (3 days)](#phase-1-audio-state--zustand-3-days)
5. [Phase 2: Profile & Friends → React Query (3 days)](#phase-2-profile--friends--react-query-3-days)
6. [Phase 3: Weekly Selections → React Query (3 days)](#phase-3-weekly-selections--react-query-3-days)
7. [Phase 4: Podcast Metadata → React Query (3 days)](#phase-4-podcast-metadata--react-query-3-days)
8. [Phase 5: Comments & Notifications → React Query (4 days)](#phase-5-comments--notifications--react-query-4-days)
9. [Phase 6: Chapters, Transcript & Members → React Query (3 days)](#phase-6-chapters-transcript--members--react-query-3-days)
10. [Phase 7: Meetups → React Query (2 days)](#phase-7-meetups--react-query-2-days)
11. [Phase 8: Initial Sync Refactor (2 days)](#phase-8-initial-sync-refactor-2-days)
12. [Phase 9: Cleanup & Optimization (2 days)](#phase-9-cleanup--optimization-2-days)
13. [Testing Strategy](#testing-strategy)
14. [Rollback Plan](#rollback-plan)
15. [Success Metrics](#success-metrics)

---

## Executive Summary

### Current State (January 2025)

✅ **Infrastructure Complete:**
- React Query v5.17.0 installed
- Zustand v4.4.7 installed
- QueryClient configured in `app/_layout.tsx`
- Realtime Manager operational (4 tables with Postgres Changes)
- Discussion feature already migrated (reference implementation)

📊 **Migration Scope:**
- **11 data-fetching contexts** → React Query hooks (~2,200 lines)
- **1 client-state context** (Audio) → Zustand store (432 lines)
- **2 infrastructure contexts** → Keep as-is (Auth, Database)
- **14 provider nest** → **3 providers** (79% reduction)

### Key Principles

1. **Observable-Driven Invalidation:** WatermelonDB observables trigger React Query cache invalidation
2. **Realtime Infrastructure Unchanged:** No modifications to RealtimeManager or repositories
3. **Incremental Migration:** One context at a time, fully tested before moving on
4. **Proven Patterns:** Follow Discussion feature implementation
5. **Zero Data Loss:** WatermelonDB remains source of truth throughout

---

## Migration Status

### ✅ Already Complete

| Feature | Status | Implementation |
|---------|--------|----------------|
| **React Query** | Installed | v5.17.0, QueryClient configured |
| **Zustand** | Installed | v4.4.7, Auth & CurrentPodcast stores |
| **Discussion Context** | Migrated | `app/hooks/queries/useDiscussion.ts` (386 lines) |
| **Realtime Infrastructure** | Complete | RealtimeManager + 4 tables |
| **ProfileContext** | Migrated | `app/hooks/queries/useProfile.ts` - Phase 2 (2025-01-16) |
| **FriendsContext** | Migrated | `app/hooks/queries/useFriends.ts` - Phase 2 (2025-01-16) |
| **PodcastMetadataContext** | Migrated | `app/hooks/queries/usePodcastMetadata.ts` - Phase 4 (2025-01-16) |

### 🔄 In Progress (This Migration)

| Context | Lines | Target | Phase | Est. Days |
|---------|-------|--------|-------|-----------|
| **AudioContextExpo** | 432 | Zustand | 1 | 3 |
| **WeeklySelectionsContext** | 285 | React Query | 3 | 3 |
| **CommentsContext** | 273 | React Query | 5 | 2 |
| **NotificationsContext** | 192 | React Query | 5 | 2 |
| **ChaptersContext** | 158 | React Query | 6 | 1 |
| **TranscriptContext** | 149 | React Query | 6 | 1 |
| **MembersContext** | 142 | React Query | 6 | 1 |
| **MeetupsContext** | 362 | React Query | 7 | 2 |
| **InitialSyncContext** | 119 | Refactor | 8 | 2 |

**Total:** 2,668 lines → ~1,100 lines (59% reduction)

---

## Phase 0: Preparation (2 days)

### Goals

- Set up development tooling
- Create folder structure
- Document patterns
- Establish testing infrastructure

### Tasks

#### Day 1: Tooling & Structure

**1. Install React Query DevTools**

```bash
npm install --save-dev @tanstack/react-query-devtools
```

**2. Create Centralized QueryClient Config**

Create `app/config/queryClient.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes (matches repository TTL)
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,

      // Retry configuration
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Network mode
      networkMode: 'offlineFirst', // WatermelonDB works offline

      // Refetch on window focus (mobile background/foreground)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Network status listener for automatic refetch on reconnect
NetInfo.addEventListener((state) => {
  if (state.isConnected) {
    queryClient.refetchQueries({ stale: true });
  }
});
```

**3. Update App Layout to Use New Config**

Edit `app/_layout.tsx`:

```typescript
// Replace this line:
// const queryClient = new QueryClient();

// With:
import { queryClient } from './config/queryClient';
```

**4. Add React Query DevTools (Development Only)**

Edit `app/_layout.tsx`:

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Inside the return statement:
<QueryClientProvider client={queryClient}>
  {/* ...existing providers... */}

  {__DEV__ && (
    <ReactQueryDevtools
      initialIsOpen={false}
      buttonPosition="bottom-right"
    />
  )}
</QueryClientProvider>
```

**5. Create Folder Structure**

```bash
mkdir -p app/hooks/queries
mkdir -p app/hooks/mutations
mkdir -p app/stores
mkdir -p app/config
```

#### Day 2: Documentation & Testing Setup

**6. Expand Query Keys File**

Edit `app/hooks/queries/queryKeys.ts`:

```typescript
export const queryKeys = {
  // Already exists
  discussion: {
    all: ['discussion'] as const,
    questions: (episodeId: string) => [...queryKeys.discussion.all, 'questions', episodeId],
    responses: (episodeId: string, userId: string) =>
      [...queryKeys.discussion.all, 'responses', episodeId, userId],
    progress: (episodeId: string, userId: string) =>
      [...queryKeys.discussion.all, 'progress', episodeId, userId],
    unanswered: (episodeId: string, userId: string) =>
      [...queryKeys.discussion.all, 'unanswered', episodeId, userId],
    questionStats: (questionId: string) =>
      [...queryKeys.discussion.all, 'stats', questionId],
  },

  // Add these:
  profile: {
    all: ['profile'] as const,
    current: () => [...queryKeys.profile.all, 'current'],
    user: (userId: string) => [...queryKeys.profile.all, userId],
  },

  friends: {
    all: ['friends'] as const,
    list: () => [...queryKeys.friends.all, 'list'],
  },

  weeklySelections: {
    all: ['weeklySelections'] as const,
    current: () => [...queryKeys.weeklySelections.all, 'current'],
    userChoices: (userId: string) => [...queryKeys.weeklySelections.all, 'choices', userId],
  },

  podcastMetadata: {
    all: ['podcastMetadata'] as const,
    progress: (episodeId: string, userId: string) =>
      [...queryKeys.podcastMetadata.all, 'progress', episodeId, userId],
    history: (userId: string) =>
      [...queryKeys.podcastMetadata.all, 'history', userId],
  },

  comments: {
    all: ['comments'] as const,
    episode: (episodeId: string) => [...queryKeys.comments.all, episodeId],
    user: (userId: string) => [...queryKeys.comments.all, 'user', userId],
  },

  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'],
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'],
  },

  chapters: {
    all: ['chapters'] as const,
    episode: (episodeId: string) => [...queryKeys.chapters.all, episodeId],
  },

  transcript: {
    all: ['transcript'] as const,
    episode: (episodeId: string) => [...queryKeys.transcript.all, episodeId],
  },

  members: {
    all: ['members'] as const,
    episode: (episodeId: string) => [...queryKeys.members.all, episodeId],
  },

  meetups: {
    all: ['meetups'] as const,
    episode: (episodeId: string) => [...queryKeys.meetups.all, episodeId],
    upcoming: () => [...queryKeys.meetups.all, 'upcoming'],
  },
};
```

**7. Create Testing Utilities**

Create `app/test/queryTestUtils.ts`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retry in tests
        gcTime: Infinity, // Keep data in cache during tests
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Silence errors in tests
    },
  });
}

export function createQueryWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**8. Create Migration Tracking Document**

Create `docs/MIGRATION_PROGRESS.md`:

```markdown
# Migration Progress Tracker

## Phase 0: Preparation
- [ ] Install DevTools
- [ ] Create queryClient.ts
- [ ] Update _layout.tsx
- [ ] Create folder structure
- [ ] Expand queryKeys.ts
- [ ] Create test utilities
- [ ] Document patterns

## Phase 1: Audio → Zustand
- [ ] Create useAudioStore.ts
- [ ] Migrate playback controls
- [ ] Migrate queue management
- [ ] Update components (10 files)
- [ ] Test playback functionality
- [ ] Delete AudioContextExpo.tsx
- [ ] Remove provider from _layout.tsx

[Continue for all phases...]
```

**9. Document the Observable-Driven Invalidation Pattern**

Create `docs/PATTERNS.md`:

```markdown
# React Query Patterns for Podcast Club

## Pattern 1: Observable-Driven Invalidation

This is our **core pattern** for integrating WatermelonDB observables with React Query.

### When to Use
- Any data that has Realtime subscriptions
- Data that updates via background sync
- Data that changes from user actions

### Implementation

```typescript
export function useEpisodeChapters(episodeId: string) {
  const { chapterRepository } = useDatabase();
  const queryClient = useQueryClient();

  // Step 1: Set up WatermelonDB observable subscription
  useEffect(() => {
    if (!episodeId) return;

    const subscription = chapterRepository
      .observeEpisodeChapters(episodeId)
      .subscribe(() => {
        // Step 2: When observable fires, invalidate React Query cache
        queryClient.invalidateQueries({
          queryKey: queryKeys.chapters.episode(episodeId)
        });
      });

    return () => subscription.unsubscribe();
  }, [episodeId, chapterRepository, queryClient]);

  // Step 3: React Query fetches and caches data
  return useQuery({
    queryKey: queryKeys.chapters.episode(episodeId),
    queryFn: async () => {
      await chapterRepository.syncWithRemote(episodeId);
      return chapterRepository.getEpisodeChapters(episodeId);
    },
    staleTime: 5 * 60 * 1000, // Match repository TTL
    enabled: !!episodeId,
  });
}
```

### Flow Diagram

```
User Opens Component
        ↓
React Query checks cache
        ↓
   Cache hit?
    ↙     ↘
  YES      NO
   ↓        ↓
Return   Fetch from
cached   repository
data        ↓
        Return data

Meanwhile...

Realtime event arrives
        ↓
RealtimeManager updates WatermelonDB
        ↓
WatermelonDB observable fires
        ↓
Invalidate React Query cache
        ↓
Auto-refetch (if component mounted)
        ↓
Component re-renders with fresh data
```

### Debouncing (For Rapid Updates)

```typescript
useEffect(() => {
  if (!episodeId) return;

  let debounceTimer: NodeJS.Timeout | null = null;

  const subscription = repository
    .observeData(episodeId)
    .subscribe(() => {
      // Debounce invalidation by 300ms
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.data.episode(episodeId)
        });
      }, 300);
    });

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    subscription.unsubscribe();
  };
}, [episodeId]);
```

### Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, createQueryWrapper } from '@/test/queryTestUtils';

test('invalidates on observable change', async () => {
  const queryClient = createTestQueryClient();
  const wrapper = createQueryWrapper(queryClient);

  const { result } = renderHook(() => useEpisodeChapters('ep1'), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(5);

  // Simulate WatermelonDB update
  act(() => {
    mockRepository.updateChapters('ep1');
  });

  // Should invalidate and refetch
  await waitFor(() => expect(result.current.data).toHaveLength(6));
});
```
```

### Acceptance Criteria

- [ ] QueryClient configured with 5-min staleTime
- [ ] DevTools accessible in development
- [ ] Query keys defined for all 11 contexts
- [ ] Test utilities created
- [ ] Pattern documentation complete
- [ ] Migration tracking document created
- [ ] Team aligned on approach

### Verification

```bash
# Verify DevTools work
npm run start
# Open app, check for React Query DevTools button

# Verify queryClient config
cat app/config/queryClient.ts

# Verify folder structure
ls -la app/hooks/queries
ls -la app/stores

# Verify query keys
cat app/hooks/queries/queryKeys.ts | grep "all:"
```

---

## Phase 1: Audio State → Zustand (3 days)

### Goals

- Migrate AudioContextExpo to Zustand store
- Establish Zustand patterns
- Reduce provider nesting
- Prove out client-state migration approach

### Current Implementation Analysis

**File:** `app/contexts/AudioContextExpo.tsx` (432 lines)

**Responsibilities:**
- Playback state (playing, paused, stopped)
- Current episode, position, duration
- Queue management (up next, history)
- Playback controls (play, pause, seek, skip)
- Audio service integration

**Why Zustand?**
- Audio state is **client state**, not server state
- Needs to be accessed globally without prop drilling
- Performance-critical (frequent updates)
- No data fetching required

### Task Breakdown

#### Day 1: Create Zustand Store

**1. Create the Audio Store**

Create `app/stores/useAudioStore.ts`:

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ExpoAudioService } from '@/services/audio/expoAudioService';

interface AudioState {
  // Playback state
  isPlaying: boolean;
  isPaused: boolean;
  isStopped: boolean;

  // Current episode
  currentEpisodeId: string | null;
  currentPosition: number;
  currentDuration: number;

  // Queue
  upNext: string[];
  history: string[];

  // Loading states
  isLoading: boolean;
  isBuffering: boolean;

  // Audio service instance
  audioService: ExpoAudioService | null;
}

interface AudioActions {
  // Playback controls
  play: (episodeId?: string) => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (position: number) => Promise<void>;

  // Queue management
  addToQueue: (episodeId: string) => void;
  removeFromQueue: (episodeId: string) => void;
  clearQueue: () => void;
  playNext: (episodeId: string) => void;

  // State updates
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsPaused: (isPaused: boolean) => void;
  setIsBuffering: (isBuffering: boolean) => void;

  // Initialization
  initializeAudioService: (service: ExpoAudioService) => void;
}

type AudioStore = AudioState & AudioActions;

export const useAudioStore = create<AudioStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isPlaying: false,
    isPaused: false,
    isStopped: true,
    currentEpisodeId: null,
    currentPosition: 0,
    currentDuration: 0,
    upNext: [],
    history: [],
    isLoading: false,
    isBuffering: false,
    audioService: null,

    // Actions
    play: async (episodeId) => {
      const { audioService, currentEpisodeId } = get();
      if (!audioService) return;

      set({ isLoading: true });

      try {
        if (episodeId && episodeId !== currentEpisodeId) {
          // Play new episode
          await audioService.loadAndPlay(episodeId);
          set({
            currentEpisodeId: episodeId,
            isPlaying: true,
            isPaused: false,
            isStopped: false,
          });
        } else {
          // Resume current episode
          await audioService.play();
          set({
            isPlaying: true,
            isPaused: false,
            isStopped: false,
          });
        }
      } finally {
        set({ isLoading: false });
      }
    },

    pause: async () => {
      const { audioService } = get();
      if (!audioService) return;

      await audioService.pause();
      set({
        isPlaying: false,
        isPaused: true,
      });
    },

    stop: async () => {
      const { audioService } = get();
      if (!audioService) return;

      await audioService.stop();
      set({
        isPlaying: false,
        isPaused: false,
        isStopped: true,
        currentPosition: 0,
      });
    },

    seek: async (position) => {
      const { audioService } = get();
      if (!audioService) return;

      await audioService.seekTo(position);
      set({ currentPosition: position });
    },

    addToQueue: (episodeId) => {
      set((state) => ({
        upNext: [...state.upNext, episodeId],
      }));
    },

    removeFromQueue: (episodeId) => {
      set((state) => ({
        upNext: state.upNext.filter(id => id !== episodeId),
      }));
    },

    clearQueue: () => {
      set({ upNext: [] });
    },

    playNext: (episodeId) => {
      set((state) => ({
        upNext: [episodeId, ...state.upNext],
      }));
    },

    setPosition: (position) => {
      set({ currentPosition: position });
    },

    setDuration: (duration) => {
      set({ currentDuration: duration });
    },

    setIsPlaying: (isPlaying) => {
      set({ isPlaying });
    },

    setIsPaused: (isPaused) => {
      set({ isPaused });
    },

    setIsBuffering: (isBuffering) => {
      set({ isBuffering });
    },

    initializeAudioService: (service) => {
      set({ audioService: service });

      // Set up audio service listeners
      service.onPlaybackStatusUpdate((status) => {
        set({
          currentPosition: status.positionSeconds,
          currentDuration: status.durationSeconds,
          isPlaying: status.isPlaying,
          isPaused: status.isPaused,
          isBuffering: status.isBuffering,
        });
      });
    },
  }))
);

// Selectors for optimized re-renders
export const selectIsPlaying = (state: AudioStore) => state.isPlaying;
export const selectCurrentEpisodeId = (state: AudioStore) => state.currentEpisodeId;
export const selectCurrentPosition = (state: AudioStore) => state.currentPosition;
export const selectUpNext = (state: AudioStore) => state.upNext;
```

**2. Create Convenience Hooks**

Create `app/stores/audioStore.hooks.ts`:

```typescript
import { useAudioStore, selectIsPlaying, selectCurrentEpisodeId } from './useAudioStore';

/**
 * Hook for components that only need playback state
 */
export function usePlaybackState() {
  return useAudioStore((state) => ({
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    isStopped: state.isStopped,
    isBuffering: state.isBuffering,
  }));
}

/**
 * Hook for components that only need playback controls
 */
export function usePlaybackControls() {
  return useAudioStore((state) => ({
    play: state.play,
    pause: state.pause,
    stop: state.stop,
    seek: state.seek,
  }));
}

/**
 * Hook for components that need queue management
 */
export function useQueue() {
  return useAudioStore((state) => ({
    upNext: state.upNext,
    history: state.history,
    addToQueue: state.addToQueue,
    removeFromQueue: state.removeFromQueue,
    clearQueue: state.clearQueue,
    playNext: state.playNext,
  }));
}

/**
 * Hook for components that need current episode info
 */
export function useCurrentEpisode() {
  return useAudioStore((state) => ({
    episodeId: state.currentEpisodeId,
    position: state.currentPosition,
    duration: state.currentDuration,
  }));
}

/**
 * Optimized hook - only re-renders when playing state changes
 */
export function useIsPlaying() {
  return useAudioStore(selectIsPlaying);
}

/**
 * Optimized hook - only re-renders when episode changes
 */
export function useCurrentEpisodeId() {
  return useAudioStore(selectCurrentEpisodeId);
}
```

#### Day 2: Update Components

**3. Find All AudioContext Usages**

```bash
grep -r "useAudio" app/components app/(tabs) app/(traditional) --include="*.tsx" --include="*.ts"
```

Expected files (~10 files):
- `app/components/MiniPlayer.tsx`
- `app/(traditional)/podcasts/player.tsx`
- `app/components/player/SeekBar.tsx`
- `app/(traditional)/upnext.tsx`
- `app/(tabs)/home.tsx`
- Others...

**4. Update Each Component**

**Before:**
```typescript
import { useAudio } from '@/contexts/AudioContextExpo';

function MiniPlayer() {
  const {
    isPlaying,
    currentEpisodeId,
    currentPosition,
    play,
    pause
  } = useAudio();

  // Component logic...
}
```

**After:**
```typescript
import { usePlaybackState, usePlaybackControls, useCurrentEpisode } from '@/stores/audioStore.hooks';

function MiniPlayer() {
  const { isPlaying } = usePlaybackState();
  const { currentEpisodeId, currentPosition } = useCurrentEpisode();
  const { play, pause } = usePlaybackControls();

  // Component logic... (unchanged)
}
```

**5. Initialize Audio Service**

Update `app/_layout.tsx`:

```typescript
import { useAudioStore } from './stores/useAudioStore';
import { ExpoAudioService } from './services/audio/expoAudioService';
import { useEffect } from 'react';

function RootLayout() {
  const initializeAudioService = useAudioStore((state) => state.initializeAudioService);

  useEffect(() => {
    const audioService = new ExpoAudioService();
    initializeAudioService(audioService);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseProvider>
        <AuthProvider>
          {/* Remove AudioProvider from here */}
          {children}
        </AuthProvider>
      </DatabaseProvider>
    </QueryClientProvider>
  );
}
```

#### Day 3: Testing & Cleanup

**6. Write Tests**

Create `app/stores/__tests__/useAudioStore.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAudioStore } from '../useAudioStore';

describe('useAudioStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAudioStore.setState({
      isPlaying: false,
      isPaused: false,
      isStopped: true,
      currentEpisodeId: null,
      currentPosition: 0,
      currentDuration: 0,
      upNext: [],
      history: [],
    });
  });

  test('initial state', () => {
    const { result } = renderHook(() => useAudioStore());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentEpisodeId).toBe(null);
    expect(result.current.upNext).toEqual([]);
  });

  test('adds episode to queue', () => {
    const { result } = renderHook(() => useAudioStore());

    act(() => {
      result.current.addToQueue('episode-1');
    });

    expect(result.current.upNext).toEqual(['episode-1']);
  });

  test('removes episode from queue', () => {
    const { result } = renderHook(() => useAudioStore());

    act(() => {
      result.current.addToQueue('episode-1');
      result.current.addToQueue('episode-2');
      result.current.removeFromQueue('episode-1');
    });

    expect(result.current.upNext).toEqual(['episode-2']);
  });

  // Add more tests...
});
```

**7. Manual Testing Checklist**

- [ ] Play episode from home screen
- [ ] Pause/resume playback
- [ ] Seek to different position
- [ ] Add episode to Up Next queue
- [ ] Remove episode from queue
- [ ] Play Next functionality
- [ ] Mini player displays correct state
- [ ] Full player displays correct state
- [ ] Background playback works
- [ ] Notification controls work

**8. Delete Old Context**

```bash
# Verify no remaining usages
grep -r "AudioContextExpo\|useAudio" app/components app/(tabs) app/(traditional) --include="*.tsx" --include="*.ts"

# If clean, delete the file
rm app/contexts/AudioContextExpo.tsx
```

**9. Remove Provider from Layout**

Edit `app/_layout.tsx`:

```typescript
// Remove this import
// import { AudioProvider } from './contexts/AudioContextExpo';

// Remove this wrapper
// <AudioProvider>
//   {children}
// </AudioProvider>
```

### Acceptance Criteria

- [ ] useAudioStore.ts created with all state and actions
- [ ] Convenience hooks created for optimized re-renders
- [ ] All 10+ components updated to use new hooks
- [ ] Audio service initialized in _layout.tsx
- [ ] Tests written and passing
- [ ] Manual testing checklist complete
- [ ] AudioContextExpo.tsx deleted
- [ ] Provider removed from _layout.tsx
- [ ] No console errors or warnings
- [ ] Performance unchanged or improved

### Rollback Plan

If issues arise:
1. Revert `app/stores/useAudioStore.ts` deletion
2. Restore AudioContextExpo.tsx from git
3. Revert component changes
4. Restore provider in _layout.tsx

---

## Phase 2: Profile & Friends → React Query (3 days)

### Goals

- Migrate two simple contexts as learning experience
- Establish React Query patterns
- Build confidence before tackling complex contexts
- Create reusable patterns for remaining phases

### Current Implementation

**ProfileContext.tsx** (145 lines)
- User profile data
- Profile updates
- No Realtime (manual refresh)

**FriendsContext.tsx** (111 lines)
- Friend list
- Contact matching
- Friend requests
- No Realtime

### Task Breakdown

#### Day 1: Profile Migration

**1. Create useProfile Query Hook**

Create `app/hooks/queries/useProfile.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';
import { useEffect } from 'react';
import type { Profile } from '@/data/models/profile.model';

/**
 * Fetch current user's profile
 */
export function useCurrentProfile() {
  const { profileRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up WatermelonDB observable subscription
  useEffect(() => {
    if (!user?.id || !profileRepository) return;

    const subscription = profileRepository
      .observeProfileById(user.id)
      .subscribe(() => {
        console.log('🔔 Profile changed, invalidating cache');
        queryClient.invalidateQueries({
          queryKey: queryKeys.profile.current()
        });
      });

    return () => subscription.unsubscribe();
  }, [user?.id, profileRepository, queryClient]);

  return useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: async () => {
      if (!user?.id) throw new Error('No authenticated user');

      // Sync from remote if needed
      await profileRepository.syncWithRemote(user.id);

      // Return local data
      return profileRepository.getCurrentUserProfile();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch any user's profile by ID
 */
export function useProfile(userId: string | null) {
  const { profileRepository } = useDatabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !profileRepository) return;

    const subscription = profileRepository
      .observeProfileById(userId)
      .subscribe(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.profile.user(userId)
        });
      });

    return () => subscription.unsubscribe();
  }, [userId, profileRepository, queryClient]);

  return useQuery({
    queryKey: queryKeys.profile.user(userId!),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      await profileRepository.syncWithRemote(userId);
      return profileRepository.getProfileById(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update profile mutation
 */
export function useUpdateProfile() {
  const { profileRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('No authenticated user');

      return profileRepository.updateProfile(user.id, updates);
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.profile.current()
      });

      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.profile.current());

      // Optimistically update
      if (previous) {
        queryClient.setQueryData(
          queryKeys.profile.current(),
          { ...previous, ...updates }
        );
      }

      return { previous };
    },
    onError: (err, updates, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.profile.current(),
          context.previous
        );
      }
    },
    onSettled: () => {
      // Always refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.current()
      });
    },
  });
}
```

**2. Update Components Using ProfileContext**

Find usages:
```bash
grep -r "useProfile" app/ --include="*.tsx" | grep -v "app/hooks/queries"
```

Update each component:

**Before:**
```typescript
import { useProfile } from '@/contexts/ProfileContext';

function ProfileScreen() {
  const { profile, loading, updateProfile } = useProfile();

  if (loading) return <LoadingSpinner />;

  return <ProfileView profile={profile} onUpdate={updateProfile} />;
}
```

**After:**
```typescript
import { useCurrentProfile, useUpdateProfile } from '@/hooks/queries/useProfile';

function ProfileScreen() {
  const { data: profile, isLoading } = useCurrentProfile();
  const updateProfile = useUpdateProfile();

  if (isLoading) return <LoadingSpinner />;

  return (
    <ProfileView
      profile={profile}
      onUpdate={(updates) => updateProfile.mutate(updates)}
    />
  );
}
```

#### Day 2: Friends Migration

**3. Create useFriends Query Hook**

Create `app/hooks/queries/useFriends.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';
import { FriendsService } from '@/services/friends.service';

const friendsService = new FriendsService();

/**
 * Fetch friend list for current user
 */
export function useFriends() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.friends.list(),
    queryFn: async () => {
      if (!user?.id) throw new Error('No authenticated user');

      return friendsService.getFriends(user.id);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes (friends change less often)
  });
}

/**
 * Match contacts mutation
 */
export function useMatchContacts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contacts: string[]) => {
      if (!user?.id) throw new Error('No authenticated user');

      return friendsService.matchContacts(user.id, contacts);
    },
    onSuccess: () => {
      // Invalidate friends list to show new matches
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.list()
      });
    },
  });
}

/**
 * Send friend request mutation
 */
export function useSendFriendRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error('No authenticated user');

      return friendsService.sendFriendRequest(user.id, friendId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.list()
      });
    },
  });
}

/**
 * Accept friend request mutation
 */
export function useAcceptFriendRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error('No authenticated user');

      return friendsService.acceptFriendRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.list()
      });
    },
  });
}
```

**4. Update Components Using FriendsContext**

Find usages and update similarly to Profile example.

#### Day 3: Testing & Cleanup

**5. Write Tests**

Create `app/hooks/queries/__tests__/useProfile.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentProfile, useUpdateProfile } from '../useProfile';
import { createTestQueryClient, createQueryWrapper } from '@/test/queryTestUtils';

describe('useCurrentProfile', () => {
  test('fetches current user profile', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper(queryClient);

    const { result } = renderHook(() => useCurrentProfile(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
    });
  });

  test('optimistically updates profile', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper(queryClient);

    const { result: profileResult } = renderHook(() => useCurrentProfile(), { wrapper });
    const { result: mutationResult } = renderHook(() => useUpdateProfile(), { wrapper });

    await waitFor(() => expect(profileResult.current.isSuccess).toBe(true));

    const originalName = profileResult.current.data.name;

    act(() => {
      mutationResult.current.mutate({ name: 'New Name' });
    });

    // Should optimistically update
    expect(profileResult.current.data.name).toBe('New Name');

    // Wait for mutation to settle
    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));
  });
});
```

**6. Manual Testing**

- [ ] View profile screen loads correctly
- [ ] Update profile (name, bio, avatar)
- [ ] View friends list
- [ ] Match contacts
- [ ] Send friend request
- [ ] Accept friend request
- [ ] Offline behavior (cached data shown)
- [ ] Online return (data refreshes)

**7. Cleanup**

```bash
# Delete old contexts
rm app/contexts/ProfileContext.tsx
rm app/contexts/FriendsContext.tsx

# Remove providers from _layout.tsx
```

### Acceptance Criteria

- [ ] useProfile.ts created with all query/mutation hooks
- [ ] useFriends.ts created with all query/mutation hooks
- [ ] All components updated
- [ ] Tests written and passing
- [ ] Manual testing complete
- [ ] Old contexts deleted
- [ ] Providers removed from _layout.tsx
- [ ] Documentation updated

---

## Phase 3: Weekly Selections → React Query (3 days)

### Goals

- Migrate the most complex data context
- Prove React Query can handle complex state
- Establish patterns for Realtime integration
- Build team confidence for remaining phases

### Current Implementation

**WeeklySelectionsContext.tsx** (285 lines)
- Weekly podcast selections (admin content)
- User weekly choices
- Selection logic
- **HAS Realtime** (Postgres Changes via RealtimeManager)

**Why Start Here?**
- Most complex data context (good stress test)
- Already has Realtime (can verify integration works)
- Used on home screen (high visibility)

### Task Breakdown

#### Day 1: Create Query Hooks

**1. Create useWeeklySelections Hook**

Create `app/hooks/queries/useWeeklySelections.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';
import { useEffect, useMemo } from 'react';
import type { WeeklySelection, UserWeeklyChoice } from '@/data/models/weekly-selection.model';

/**
 * Fetch current week's podcast selections
 *
 * Integrates with Realtime:
 * - RealtimeManager listens to weekly_selections table
 * - Updates WatermelonDB on changes
 * - Observable fires -> Invalidates cache -> Auto-refetch
 */
export function useWeeklySelections() {
  const { weeklySelectionRepository } = useDatabase();
  const queryClient = useQueryClient();

  // Observable-Driven Invalidation (Pattern 1)
  useEffect(() => {
    if (!weeklySelectionRepository) return;

    const subscription = weeklySelectionRepository
      .observeCurrentWeekSelections()
      .subscribe(() => {
        console.log('🔔 Weekly selections changed via Realtime, invalidating cache');
        queryClient.invalidateQueries({
          queryKey: queryKeys.weeklySelections.current()
        });
      });

    return () => subscription.unsubscribe();
  }, [weeklySelectionRepository, queryClient]);

  return useQuery({
    queryKey: queryKeys.weeklySelections.current(),
    queryFn: async () => {
      // Sync from remote (respects 5-min TTL in repository)
      await weeklySelectionRepository.syncWithRemote();

      // Return local data
      return weeklySelectionRepository.getCurrentWeekSelections();
    },
    staleTime: 5 * 60 * 1000, // Match repository TTL
  });
}

/**
 * Fetch user's weekly choices
 */
export function useUserWeeklyChoices() {
  const { weeklySelectionRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id || !weeklySelectionRepository) return;

    const subscription = weeklySelectionRepository
      .observeUserWeeklyChoices(user.id)
      .subscribe(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.weeklySelections.userChoices(user.id)
        });
      });

    return () => subscription.unsubscribe();
  }, [user?.id, weeklySelectionRepository, queryClient]);

  return useQuery({
    queryKey: queryKeys.weeklySelections.userChoices(user.id!),
    queryFn: async () => {
      if (!user?.id) throw new Error('No authenticated user');

      return weeklySelectionRepository.getUserWeeklyChoices(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Combined hook for home screen convenience
 *
 * Returns:
 * - selections: All weekly podcasts
 * - userChoice: User's selected episode (or null)
 * - isLoading: Combined loading state
 */
export function useWeeklySelectionsWithChoice() {
  const { data: selections = [], isLoading: selectionsLoading } = useWeeklySelections();
  const { data: userChoices = [], isLoading: choicesLoading } = useUserWeeklyChoices();

  const userChoice = useMemo(() => {
    if (userChoices.length === 0) return null;

    // Get the most recent choice
    const latestChoice = userChoices[0];

    // Find the matching selection
    return selections.find(s => s.episodeId === latestChoice.episodeId) || null;
  }, [selections, userChoices]);

  return {
    selections,
    userChoice,
    isLoading: selectionsLoading || choicesLoading,
  };
}

/**
 * Select episode mutation
 */
export function useSelectEpisode() {
  const { weeklySelectionRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (episodeId: string) => {
      if (!user?.id) throw new Error('No authenticated user');

      return weeklySelectionRepository.selectEpisode(user.id, episodeId);
    },
    onMutate: async (episodeId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.weeklySelections.userChoices(user!.id)
      });

      // Snapshot previous
      const previous = queryClient.getQueryData(
        queryKeys.weeklySelections.userChoices(user!.id)
      );

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.weeklySelections.userChoices(user!.id),
        (old: UserWeeklyChoice[] = []) => [
          {
            id: 'temp',
            userId: user!.id,
            episodeId,
            selectedAt: new Date().toISOString(),
          },
          ...old,
        ]
      );

      return { previous };
    },
    onError: (err, episodeId, context) => {
      // Rollback
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.weeklySelections.userChoices(user!.id),
          context.previous
        );
      }
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.weeklySelections.userChoices(user!.id)
      });
    },
  });
}

/**
 * Change selection mutation (deselect + select)
 */
export function useChangeSelection() {
  const { weeklySelectionRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (episodeId: string) => {
      if (!user?.id) throw new Error('No authenticated user');

      // This might involve deselecting current + selecting new
      return weeklySelectionRepository.changeSelection(user.id, episodeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.weeklySelections.userChoices(user!.id)
      });
    },
  });
}
```

#### Day 2: Update Components

**2. Update Home Screen**

Update `app/(tabs)/home.tsx`:

**Before:**
```typescript
import { useWeeklySelections } from '@/contexts/WeeklySelectionsContext';

export default function HomeScreen() {
  const {
    selections,
    userChoice,
    loading,
    selectEpisode
  } = useWeeklySelections();

  if (loading) return <LoadingSpinner />;

  return (
    <WeeklySelectionsList
      selections={selections}
      userChoice={userChoice}
      onSelect={selectEpisode}
    />
  );
}
```

**After:**
```typescript
import {
  useWeeklySelectionsWithChoice,
  useSelectEpisode
} from '@/hooks/queries/useWeeklySelections';

export default function HomeScreen() {
  const {
    selections,
    userChoice,
    isLoading
  } = useWeeklySelectionsWithChoice();

  const selectEpisode = useSelectEpisode();

  if (isLoading) return <LoadingSpinner />;

  return (
    <WeeklySelectionsList
      selections={selections}
      userChoice={userChoice}
      onSelect={(episodeId) => selectEpisode.mutate(episodeId)}
    />
  );
}
```

**3. Update Other Components**

Find all usages:
```bash
grep -r "useWeeklySelections" app/ --include="*.tsx" | grep -v "app/hooks/queries"
```

Update each one following the same pattern.

#### Day 3: Testing & Realtime Verification

**4. Write Tests**

Create `app/hooks/queries/__tests__/useWeeklySelections.test.ts`:

```typescript
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWeeklySelections, useSelectEpisode } from '../useWeeklySelections';
import { createTestQueryClient, createQueryWrapper } from '@/test/queryTestUtils';

describe('useWeeklySelections', () => {
  test('fetches weekly selections', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper(queryClient);

    const { result } = renderHook(() => useWeeklySelections(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          episodeId: expect.any(String),
          title: expect.any(String),
        })
      ])
    );
  });

  test('invalidates cache on observable change', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper(queryClient);

    const { result } = renderHook(() => useWeeklySelections(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const initialLength = result.current.data.length;

    // Simulate Realtime update via WatermelonDB
    act(() => {
      mockWeeklySelectionRepository.addSelection({
        episodeId: 'new-episode',
        title: 'New Episode',
      });
    });

    // Should invalidate and refetch
    await waitFor(() => {
      expect(result.current.data.length).toBe(initialLength + 1);
    });
  });
});
```

**5. Test Realtime Integration**

**Manual Realtime Test:**

1. Open app on Device A (or emulator)
2. Open Supabase Studio SQL Editor
3. Insert new weekly selection:
   ```sql
   INSERT INTO weekly_selections (id, episode_id, title, week_start_date)
   VALUES (uuid_generate_v4(), 'test-episode-id', 'Test Episode', NOW());
   ```
4. **Expected:** Device A home screen updates within 1-2 seconds
5. **Verify:** Check React Query DevTools, should show cache invalidation

**Console Logs to Look For:**
```
🔔 Weekly selections changed via Realtime, invalidating cache
[React Query] Query invalidated: weeklySelections.current
[React Query] Fetching: weeklySelections.current
```

**6. Cleanup**

```bash
rm app/contexts/WeeklySelectionsContext.tsx
```

Remove from `_layout.tsx`.

### Acceptance Criteria

- [ ] useWeeklySelections.ts created with all hooks
- [ ] Home screen updated and working
- [ ] All other components updated
- [ ] Tests written and passing
- [ ] Realtime integration verified (manual test)
- [ ] Observable invalidation working correctly
- [ ] Optimistic updates working
- [ ] Old context deleted
- [ ] Provider removed

**Key Success Metric:** Realtime update from Supabase → App updates within 2 seconds

---

## Phase 4: Podcast Metadata → React Query (3 days)

### Goals

- Migrate complex metadata context
- Handle episode progress tracking
- Establish patterns for user-specific data
- No Realtime (simpler pattern)

### Current Implementation

**PodcastMetadataContext.tsx** (300 lines)
- Episode progress tracking
- Listening history
- Episode stats
- No Realtime (local updates only)

### Task Breakdown

*(Following similar pattern to Phase 3, details omitted for brevity)*

**Day 1:** Create query hooks (`usePodcastMetadata.ts`)
**Day 2:** Update components
**Day 3:** Test and cleanup

Key hooks:
- `useEpisodeProgress(episodeId, userId)`
- `useListeningHistory(userId)`
- `useSaveProgress()` (mutation)
- `useMarkComplete()` (mutation)

---

## Phase 5: Comments & Notifications → React Query (4 days)

### Goals

- Migrate two Realtime-enabled contexts
- Handle complex mutations (reactions, replies)
- Establish notification patterns
- Build on established patterns

### Current Implementation

**CommentsContext.tsx** (273 lines)
- Episode comments
- Comment reactions
- Replies
- Manual sync (no automatic Realtime)

**NotificationsContext.tsx** (192 lines)
- User notifications
- Unread count
- **HAS Realtime** (Broadcast channel)

### Task Breakdown

#### Days 1-2: Comments Migration

Create `app/hooks/queries/useComments.ts`:

Key hooks:
- `useEpisodeComments(episodeId)` - With observable invalidation
- `useCreateComment()` - Optimistic update
- `useToggleReaction()` - Optimistic update
- `useReplyToComment()` - Optimistic update

**Optimistic Update Pattern (Important!):**

```typescript
export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, reaction }) => {
      return commentRepository.toggleReaction(commentId, reaction);
    },
    onMutate: async ({ commentId, reaction }) => {
      // Cancel queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.comments.episode(episodeId)
      });

      // Snapshot
      const previous = queryClient.getQueryData(
        queryKeys.comments.episode(episodeId)
      );

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.comments.episode(episodeId),
        (old: Comment[]) => old.map(comment => {
          if (comment.id !== commentId) return comment;

          // Toggle reaction
          const existingReaction = comment.reactions.find(
            r => r.userId === user.id && r.reaction === reaction
          );

          if (existingReaction) {
            // Remove reaction
            return {
              ...comment,
              reactions: comment.reactions.filter(r => r !== existingReaction),
            };
          } else {
            // Add reaction
            return {
              ...comment,
              reactions: [
                ...comment.reactions,
                { userId: user.id, reaction, createdAt: new Date() }
              ],
            };
          }
        })
      );

      return { previous };
    },
    onError: (err, vars, context) => {
      // Rollback
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.comments.episode(episodeId),
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.episode(episodeId)
      });
    },
  });
}
```

#### Days 3-4: Notifications Migration

Create `app/hooks/queries/useNotifications.ts`:

Key hooks:
- `useNotifications()` - With Realtime (Broadcast channel)
- `useUnreadCount()` - Derived query
- `useMarkAsRead()` - Optimistic update

**Broadcast Channel Integration:**

```typescript
export function useNotifications() {
  const { notificationRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Broadcast channel subscription (different from Postgres Changes)
  useEffect(() => {
    if (!user?.id) return;

    const subscription = notificationRepository
      .subscribeToBroadcast(user.id)
      .subscribe((notification) => {
        console.log('🔔 New notification via Broadcast', notification);

        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.list()
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.unreadCount()
        });
      });

    return () => subscription.unsubscribe();
  }, [user?.id, notificationRepository, queryClient]);

  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: async () => {
      if (!user?.id) throw new Error('No authenticated user');

      await notificationRepository.syncNotifications(user.id);
      return notificationRepository.getNotifications(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute (notifications are time-sensitive)
  });
}
```

### Acceptance Criteria

- [ ] useComments.ts with optimistic reactions/replies
- [ ] useNotifications.ts with Broadcast integration
- [ ] All components updated
- [ ] Realtime verified for notifications
- [ ] Tests passing
- [ ] Old contexts deleted

---

## Phase 6: Chapters, Transcript & Members → React Query (3 days)

### Goals

- Migrate three similar, Realtime-enabled contexts
- Batch migration for efficiency
- All three have similar patterns

### Current Implementation

All three have:
- Episode-specific data
- Realtime enabled (Postgres Changes)
- Similar repository methods
- Observable patterns

### Task Breakdown

**Day 1:** Create all three query hooks files
**Day 2:** Update all components
**Day 3:** Test all three together

**Pattern (applies to all three):**

```typescript
export function useEpisodeChapters(episodeId: string) {
  const { chapterRepository } = useDatabase();
  const queryClient = useQueryClient();

  // Observable-Driven Invalidation
  useEffect(() => {
    if (!episodeId) return;

    const subscription = chapterRepository
      .observeEpisodeChapters(episodeId)
      .subscribe(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.chapters.episode(episodeId)
        });
      });

    return () => subscription.unsubscribe();
  }, [episodeId]);

  return useQuery({
    queryKey: queryKeys.chapters.episode(episodeId),
    queryFn: async () => {
      await chapterRepository.syncWithRemote(episodeId);
      return chapterRepository.getEpisodeChapters(episodeId);
    },
    enabled: !!episodeId,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Files to create:**
- `app/hooks/queries/useChapters.ts`
- `app/hooks/queries/useTranscript.ts`
- `app/hooks/queries/useMembers.ts`

### Acceptance Criteria

- [ ] All three query hooks created
- [ ] All components updated (player, sheets, etc.)
- [ ] Realtime verified for all three
- [ ] Tests passing
- [ ] Old contexts deleted

---

## Phase 7: Meetups → React Query (2 days)

### Goals

- Migrate complex meetups context
- Handle RSVP mutations
- Establish patterns for time-sensitive data

### Current Implementation

**MeetupsContext.tsx** (362 lines)
- Episode meetups
- RSVP management
- Attendee tracking
- Manual sync (no automatic Realtime)

### Task Breakdown

**Day 1:** Create hooks with RSVP mutations
**Day 2:** Update components, test, cleanup

Key hooks:
- `useMeetupsForEpisode(episodeId)`
- `useUpcomingMeetups()`
- `useJoinMeetup()` - Optimistic
- `useLeaveMeetup()` - Optimistic

---

## Phase 8: Initial Sync Refactor (2 days)

### Goals

- Refactor InitialSyncContext to use React Query prefetch
- Orchestrate app startup data loading
- Improve startup performance

### Current Implementation

**InitialSyncContext.tsx** (119 lines)
- Orchestrates sync on app start
- Sequential loading
- Progress tracking

### New Approach: React Query Prefetch

```typescript
export async function prefetchAppData(queryClient: QueryClient, userId: string) {
  // Prefetch critical data in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.profile.current(),
      queryFn: () => profileRepository.getCurrentUserProfile(),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.weeklySelections.current(),
      queryFn: () => weeklySelectionRepository.getCurrentWeekSelections(),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.notifications.unreadCount(),
      queryFn: () => notificationRepository.getUnreadCount(userId),
    }),
  ]);
}
```

**Update _layout.tsx:**

```typescript
function RootLayout() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!user) return;

    prefetchAppData(queryClient, user.id)
      .then(() => setIsReady(true))
      .catch(console.error);
  }, [user]);

  if (!isReady) return <SplashScreen />;

  return <AppContent />;
}
```

### Acceptance Criteria

- [ ] Prefetch function created
- [ ] Critical queries identified and prefetched
- [ ] Parallel loading working
- [ ] Splash screen dismissed correctly
- [ ] Performance improved (measure startup time)
- [ ] InitialSyncContext deleted

---

## Phase 9: Cleanup & Optimization (2 days)

### Goals

- Remove all old context files
- Optimize query configurations
- Add ESLint rules
- Document patterns
- Measure improvements

### Tasks

**Day 1: Cleanup**

1. **Verify No Remaining Context Usages**
   ```bash
   # Should return nothing
   grep -r "useWeeklySelections\|useComments\|useChapters" app/ --include="*.tsx" | grep "contexts/"
   ```

2. **Delete All Migrated Contexts**
   ```bash
   rm app/contexts/AudioContextExpo.tsx
   rm app/contexts/WeeklySelectionsContext.tsx
   rm app/contexts/CommentsContext.tsx
   rm app/contexts/NotificationsContext.tsx
   rm app/contexts/MeetupsContext.tsx
   rm app/contexts/MembersContext.tsx
   rm app/contexts/ChaptersContext.tsx
   rm app/contexts/TranscriptContext.tsx
   rm app/contexts/ProfileContext.tsx
   rm app/contexts/PodcastMetadataContext.tsx
   rm app/contexts/FriendsContext.tsx
   rm app/contexts/InitialSyncContext.tsx
   ```

3. **Update _layout.tsx to Final State**
   ```typescript
   // BEFORE: 14 providers
   <QueryClientProvider>
     <DatabaseProvider>
       <AuthProvider>
         <AudioProvider>
           <WeeklySelectionsProvider>
             <CommentsProvider>
               <NotificationsProvider>
                 <MeetupsProvider>
                   <MembersProvider>
                     <ChaptersProvider>
                       <TranscriptProvider>
                         <ProfileProvider>
                           <MetadataProvider>
                             <FriendsProvider>
                               <InitialSyncProvider>
                                 {children}
                               </InitialSyncProvider>
                             </FriendsProvider>
                           </MetadataProvider>
                         </ProfileProvider>
                       </TranscriptProvider>
                     </ChaptersProvider>
                   </MembersProvider>
                 </MeetupsProvider>
               </NotificationsProvider>
             </CommentsProvider>
           </WeeklySelectionsProvider>
         </AudioProvider>
       </AuthProvider>
     </DatabaseProvider>
   </QueryClientProvider>

   // AFTER: 3 providers
   <QueryClientProvider client={queryClient}>
     <DatabaseProvider>
       <AuthProvider>
         {children}
       </AuthProvider>
     </DatabaseProvider>
   </QueryClientProvider>
   ```

4. **Add ESLint Rule**

   Create `.eslintrc.local.js`:
   ```javascript
   module.exports = {
     rules: {
       'no-restricted-imports': ['error', {
         patterns: [{
           group: ['**/contexts/*Context'],
           message: 'Import from hooks/queries instead of contexts',
         }]
       }]
     }
   };
   ```

**Day 2: Optimization & Documentation**

5. **Optimize Query Configurations**

   Review and tune:
   - `staleTime` for each query type
   - `gcTime` for memory management
   - Retry strategies
   - Refetch policies

6. **Add React Query Plugins**

   ```bash
   npm install @tanstack/react-query-persist-client
   ```

   Configure persistence:
   ```typescript
   import { persistQueryClient } from '@tanstack/react-query-persist-client';
   import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
   import AsyncStorage from '@react-native-async-storage/async-storage';

   const asyncStoragePersister = createAsyncStoragePersister({
     storage: AsyncStorage,
   });

   persistQueryClient({
     queryClient,
     persister: asyncStoragePersister,
     maxAge: 24 * 60 * 60 * 1000, // 24 hours
   });
   ```

7. **Update Documentation**

   Create `docs/QUERY_HOOKS_REFERENCE.md`:
   - List all query hooks
   - Usage examples
   - Query key reference
   - Mutation patterns

8. **Measure Improvements**

   Before/After metrics:
   - Bundle size
   - Memory usage
   - Render counts
   - Network requests
   - Code lines

### Acceptance Criteria

- [ ] All old context files deleted
- [ ] _layout.tsx reduced to 3 providers
- [ ] ESLint rule preventing context imports
- [ ] Query configurations optimized
- [ ] Persistence configured
- [ ] Documentation complete
- [ ] Metrics collected and documented
- [ ] Team training completed

---

## Testing Strategy

### Unit Tests

**Query Hooks:**
```typescript
// Pattern for all query hooks
test('fetches data successfully', async () => {
  const { result } = renderHook(() => useEpisodeChapters('ep1'), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeDefined();
});

test('handles errors', async () => {
  mockRepository.getEpisodeChapters.mockRejectedValue(new Error('Failed'));
  const { result } = renderHook(() => useEpisodeChapters('ep1'), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
});

test('invalidates on observable change', async () => {
  // Test observable-driven invalidation
});
```

**Mutation Hooks:**
```typescript
test('optimistic update works', async () => {
  // Test optimistic update
});

test('rolls back on error', async () => {
  // Test error rollback
});
```

### Integration Tests

**Realtime Integration:**
- Test Postgres Changes → Observable → Invalidation
- Test Broadcast → Subscription → Invalidation
- Verify debouncing works

**Component Integration:**
- Test data loading states
- Test error states
- Test refetch behavior

### Manual Testing Checklist

**Per Phase:**
- [ ] Happy path works
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Offline behavior works (cached data shown)
- [ ] Online return refetches data
- [ ] Realtime updates work (if applicable)
- [ ] Optimistic updates work (if applicable)
- [ ] Performance unchanged or improved
- [ ] No console errors
- [ ] No memory leaks

**Final Testing (Phase 9):**
- [ ] All features working end-to-end
- [ ] App startup time acceptable
- [ ] Memory usage acceptable
- [ ] Network usage acceptable
- [ ] Battery usage unchanged
- [ ] No regressions in any feature

---

## Rollback Plan

### Per-Phase Rollback

If a phase fails:

1. **Stop Migration**
   - Don't proceed to next phase
   - Assess the issue

2. **Revert Changes**
   ```bash
   git log --oneline -10  # Find commit before phase
   git revert <commit-hash>
   ```

3. **Restore Old Context**
   ```bash
   git checkout HEAD~1 -- app/contexts/ContextName.tsx
   ```

4. **Restore Provider in _layout.tsx**
   ```bash
   git checkout HEAD~1 -- app/_layout.tsx
   ```

5. **Fix Component Imports**
   ```bash
   # Find components using new hooks
   grep -r "useNewHook" app/
   # Revert each file
   git checkout HEAD~1 -- path/to/component.tsx
   ```

### Full Migration Rollback

If catastrophic failure:

1. **Create Rollback Branch**
   ```bash
   git checkout -b rollback-react-query
   ```

2. **Revert All Migration Commits**
   ```bash
   git revert <start-commit>..<end-commit>
   ```

3. **Test Thoroughly**
   - Ensure app works as before migration
   - Run full test suite
   - Manual testing

4. **Merge Rollback**
   ```bash
   git checkout main
   git merge rollback-react-query
   ```

### Rollback Decision Criteria

Roll back a phase if:
- Data loss occurs
- Critical features broken
- Performance regression >20%
- Unable to fix issues within 1 day
- Team lacks confidence to proceed

Roll back entire migration if:
- Multiple phases fail
- Fundamental architecture issue discovered
- Timeline exceeds 2x estimate (10 weeks)
- Product priorities change

---

## Success Metrics

### Code Metrics

**Lines of Code:**
- Before: ~2,668 lines (contexts)
- After: ~1,100 lines (query hooks)
- Reduction: 59%

**Provider Nesting:**
- Before: 14 providers
- After: 3 providers
- Reduction: 79%

**Bundle Size:**
- Target: <50kb increase (React Query ~13kb gzipped)
- Offset by removed context code

### Performance Metrics

**Network Requests:**
- Should remain same (~92% reduction from Realtime already achieved)
- Request deduplication may improve further

**Render Counts:**
- Target: 30-40% reduction (no provider cascade)
- Measure with React DevTools Profiler

**Memory Usage:**
- Target: Unchanged or improved
- Monitor with Xcode Instruments / Android Profiler

**App Startup:**
- Target: 20-30% improvement (parallel prefetch)
- Measure time from launch to home screen interactive

**Battery Usage:**
- Target: Unchanged (should remain 85% improvement)
- Monitor over 1-hour usage session

### Developer Experience Metrics

**Testing:**
- Test writing time reduced (no context mocking)
- Test maintenance easier (isolated hooks)

**Debugging:**
- React Query DevTools provide better visibility
- Cache inspection easier

**Onboarding:**
- New developers understand patterns faster
- Less "magic" in provider nesting

**Feature Development:**
- Time to add new data-fetching feature reduced
- Less boilerplate code

### Before/After Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Context Providers | 14 | 3 | 79% |
| Context Code | 2,668 lines | 0 lines | 100% |
| Query Hooks | 386 lines (1) | ~1,100 lines (11) | N/A |
| Data Fetching Patterns | 14 different | 1 standard | 93% |
| Test Mocking Complexity | High | Low | 70% |
| DevTools Quality | Limited | Excellent | N/A |
| Provider Nesting Depth | 14 levels | 3 levels | 79% |
| Bundle Size | Baseline | +~50kb | -2% |
| Network Efficiency | 92% reduction | 92% reduction | Same |
| Render Efficiency | Baseline | +35% | +35% |
| Startup Time | Baseline | -25% | +25% |

---

## Timeline Summary

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 0** | 2 days | Preparation, tooling, structure |
| **Phase 1** | 3 days | Audio → Zustand |
| **Phase 2** | 3 days | Profile & Friends → React Query |
| **Phase 3** | 3 days | Weekly Selections → React Query |
| **Phase 4** | 3 days | Podcast Metadata → React Query |
| **Phase 5** | 4 days | Comments & Notifications → React Query |
| **Phase 6** | 3 days | Chapters, Transcript & Members → React Query |
| **Phase 7** | 2 days | Meetups → React Query |
| **Phase 8** | 2 days | Initial Sync Refactor |
| **Phase 9** | 2 days | Cleanup & Optimization |
| **Buffer** | 5 days | Contingency for issues |
| **TOTAL** | **32 days** | **~6.5 weeks** |

**Recommended Schedule:** 5 weeks of focused work + 1.5 weeks buffer

---

## Key Takeaways

1. **Realtime Infrastructure is Migration-Ready**
   - No changes needed to RealtimeManager
   - No changes needed to repositories
   - Observable-Driven Invalidation pattern proven in Discussion feature

2. **React Query and Realtime are Complementary**
   - Realtime handles push updates
   - React Query handles smart caching
   - Together they optimize network, battery, and UX

3. **Migration is Incremental and Safe**
   - One context at a time
   - Each phase independently tested
   - Rollback available at any point

4. **Significant Benefits Await**
   - 59% code reduction
   - 79% provider reduction
   - Better DevTools, testing, and patterns
   - Improved startup performance

5. **Timeline is Realistic**
   - 5 weeks core work + 1.5 weeks buffer
   - Based on existing Discussion feature migration
   - Accounts for learning curve and testing

---

## Next Steps

### To Begin Migration:

1. **Review this document with team**
2. **Allocate 6.5 weeks in roadmap**
3. **Assign developer(s) to migration**
4. **Start Phase 0** (preparation)
5. **Execute phases sequentially**
6. **Track progress in MIGRATION_PROGRESS.md**

### Questions to Answer Before Starting:

- [ ] Do we have 6.5 weeks of bandwidth?
- [ ] Is the team aligned on React Query approach?
- [ ] Are we comfortable with the rollback plan?
- [ ] Do we want to proceed now or defer 3-6 months?

**Good luck with the migration! 🚀**
