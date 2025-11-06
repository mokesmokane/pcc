# State Management Migration Plan
## From Context API to Zustand + React Query

**Project:** Podcast Club App
**Date:** 2025-01-14
**Estimated Duration:** 4-5 weeks
**Effort:** Medium-High
**Risk Level:** Medium

---

## Executive Summary

This document outlines a comprehensive plan to migrate from a nested Context API architecture (17 providers) to a modern hybrid architecture using **Zustand** for client state and **React Query** for server state. This migration will:

- Reduce provider nesting from 17 levels to 3 levels
- Improve app performance by 30-40% (estimated)
- Reduce state management code by ~60%
- Enable better testing, debugging, and maintainability
- Provide incremental migration path with minimal disruption

### Key Benefits
- ✅ **Performance**: Eliminate unnecessary re-renders, smart caching
- ✅ **Developer Experience**: Better DevTools, less boilerplate
- ✅ **Code Quality**: Clearer separation of concerns
- ✅ **Testing**: Easier to mock and test
- ✅ **Scalability**: Better architecture for future features

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target Architecture](#target-architecture)
3. [Migration Phases](#migration-phases)
4. [Detailed Implementation Guide](#detailed-implementation-guide)
5. [Timeline & Milestones](#timeline--milestones)
6. [Risk Assessment & Mitigation](#risk-assessment--mitigation)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Plan](#rollback-plan)
9. [Success Metrics](#success-metrics)

---

## Current State Analysis

### Existing Architecture

```
app/_layout.tsx (17 nested providers)
├── DatabaseProvider
│   ├── AuthProvider
│   │   ├── InitialSyncProvider
│   │   │   ├── ProfileProvider
│   │   │   │   ├── FriendsProvider
│   │   │   │   │   ├── NotificationsProvider
│   │   │   │   │   │   ├── CommentsProvider
│   │   │   │   │   │   │   ├── MembersProvider
│   │   │   │   │   │   │   │   ├── MeetupsProvider
│   │   │   │   │   │   │   │   │   ├── DiscussionProvider
│   │   │   │   │   │   │   │   │   │   ├── UserResponsesProvider
│   │   │   │   │   │   │   │   │   │   │   ├── PodcastMetadataProvider
│   │   │   │   │   │   │   │   │   │   │   │   ├── AudioProvider
│   │   │   │   │   │   │   │   │   │   │   │   │   ├── ChaptersProvider
│   │   │   │   │   │   │   │   │   │   │   │   │   │   ├── TranscriptProvider
│   │   │   │   │   │   │   │   │   │   │   │   │   │   │   ├── WeeklySelectionsProvider
│   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   └── CurrentPodcastProvider
```

### Context Files to Migrate

| Context | Lines | Primary Concern | Migration Target |
|---------|-------|----------------|------------------|
| `AudioContextExpo.tsx` | 430 | Audio playback state | Zustand Store |
| `WeeklySelectionsContext.tsx` | 242 | Server data fetching | React Query |
| `CommentsContext.tsx` | 273 | Server data + real-time | React Query |
| `NotificationsContext.tsx` | 165 | Server data + real-time | React Query |
| `MembersContext.tsx` | ~200 | Server data | React Query |
| `MeetupsContext.tsx` | ~180 | Server data | React Query |
| `TranscriptContext.tsx` | ~150 | Server data | React Query |
| `ChaptersContext.tsx` | ~150 | Server data | React Query |
| `ProfileContext.tsx` | ~180 | Server data | React Query |
| `PodcastMetadataContext.tsx` | ~200 | Server data | React Query |
| `FriendsContext.tsx` | ~120 | Server data | React Query |
| `DiscussionContext.tsx` | ~180 | Server data | React Query |
| `UserResponsesContext.tsx` | ~120 | Server data | React Query |
| `CurrentPodcastContext.tsx` | ~150 | Derived state | Zustand Store |
| `InitialSyncContext.tsx` | ~100 | Sync orchestration | React Query + Zustand |
| **KEEP:** `AuthContext.tsx` | ~200 | Auth session | Context (stable) |
| **KEEP:** `DatabaseContext.tsx` | ~100 | DB instance | Context (stable) |

**Total Lines to Migrate:** ~2,940 lines
**Estimated Reduction:** ~1,800 lines (60% reduction)

### Current Problems

1. **Performance Issues**
   - Cascading re-renders through 17 provider levels
   - No request deduplication (multiple components fetch same data)
   - Missing memoization dependencies in several contexts
   - Interval-based polling instead of smart invalidation

2. **Developer Experience**
   - Testing requires mocking 6+ contexts per component
   - No centralized DevTools
   - Stack traces polluted with provider names
   - Difficult to trace state mutations

3. **Code Quality**
   - Scattered loading/error state management
   - Duplicate data fetching logic
   - Tight coupling between contexts
   - Inconsistent patterns across contexts

4. **Maintainability**
   - Hard to add new features (need to wire through providers)
   - Difficult to refactor (dependency graph is complex)
   - No clear separation between server/client state

---

## Target Architecture

### Architectural Layers

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                     │
│                  (React Components)                       │
│                                                           │
│  Uses: useQuery, useMutation, useAudioStore, etc.       │
└─────────────────────────────────────────────────────────┘
                           ↓ ↑
┌─────────────────────────────────────────────────────────┐
│               STATE MANAGEMENT LAYER                      │
│                                                           │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │   React Query    │  │  Zustand Stores  │            │
│  │  (Server State)  │  │  (Client State)  │            │
│  │                  │  │                  │            │
│  │ • Caching        │  │ • UI state       │            │
│  │ • Sync           │  │ • Audio playback │            │
│  │ • Invalidation   │  │ • Selections     │            │
│  └──────────────────┘  └──────────────────┘            │
│           ↓ ↑                   ↓ ↑                      │
└─────────────────────────────────────────────────────────┘
                           ↓ ↑
┌─────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                          │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Repository Pattern (Keep as-is)          │  │
│  │                                                    │  │
│  │  • WeeklySelectionRepository                      │  │
│  │  • CommentRepository                              │  │
│  │  • MeetupRepository                               │  │
│  │  • etc.                                           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓ ↑
┌─────────────────────────────────────────────────────────┐
│                   PERSISTENCE LAYER                      │
│                                                           │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  WatermelonDB    │  │  Supabase API    │            │
│  │  (Local SQLite)  │  │  (Remote Sync)   │            │
│  └──────────────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### Minimal Provider Tree

```tsx
// app/_layout.tsx - Target State
<ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <DatabaseProvider>
      <AuthProvider>
        {/* All other state via hooks */}
        <Stack>...</Stack>
      </AuthProvider>
    </DatabaseProvider>
  </QueryClientProvider>
</ErrorBoundary>
```

**From 17 providers → 3 providers** (82% reduction)

### State Classification

| State Type | Current Solution | Target Solution | Examples |
|------------|------------------|-----------------|----------|
| **Server State** | Context API | React Query | Weekly selections, comments, meetups |
| **Client State** | Context API | Zustand | Audio playback, UI modals, selections |
| **Global Context** | Context API | Context API (keep) | Auth session, DB instance |
| **Derived State** | Context with useMemo | Zustand selectors | Current podcast, progress calculations |

---

## Migration Phases

### Phase 0: Preparation (Week 0 - 2 days)
**Goal:** Set up infrastructure and plan detailed migration

**Tasks:**
- [ ] Configure React Query client with optimal settings
- [ ] Set up React Query DevTools
- [ ] Set up Zustand DevTools
- [ ] Create folder structure for new architecture
- [ ] Document existing context dependencies
- [ ] Set up feature flags for gradual rollout
- [ ] Brief team on new patterns

**Deliverables:**
- ✅ Query client configured
- ✅ DevTools integrated
- ✅ Folder structure created
- ✅ Migration tracking document

---

### Phase 1: Audio State Migration (Week 1 - 5 days)
**Goal:** Migrate AudioContextExpo.tsx to Zustand (pilot phase)

**Why Start Here:**
- Self-contained (minimal dependencies)
- Immediate performance wins
- Validates Zustand approach
- High-impact (used throughout app)

#### Step 1.1: Create Audio Store

**File:** `app/stores/audioStore.ts`

```tsx
import create from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Track } from '../services/audio/expoAudioService';
import { expoAudioService } from '../services/audio/expoAudioService';

interface AudioState {
  // Playback state
  isPlaying: boolean;
  isBuffering: boolean;
  currentTrack: Track | null;
  queue: Track[];

  // Progress
  position: number;
  duration: number;
  buffered: number;

  // Settings
  playbackRate: number;
  sleepTimer: number | null;

  // Actions
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  skipForward: () => Promise<void>;
  skipBackward: () => Promise<void>;
  addToQueue: (episode: any) => Promise<Track>;
  playNext: (episode: any) => Promise<void>;
  playNow: (episode: any, startPosition?: number) => Promise<void>;
  removeFromQueue: (trackId: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  setSleepTimer: (minutes: number | null) => void;

  // Internal state setters
  _setIsPlaying: (isPlaying: boolean) => void;
  _setIsBuffering: (isBuffering: boolean) => void;
  _setPosition: (position: number) => void;
  _setDuration: (duration: number) => void;
  _setBuffered: (buffered: number) => void;
  _setCurrentTrack: (track: Track | null) => void;
  _setQueue: (queue: Track[]) => void;
}

export const useAudioStore = create<AudioState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isPlaying: false,
    isBuffering: false,
    currentTrack: null,
    queue: [],
    position: 0,
    duration: 0,
    buffered: 0,
    playbackRate: 1,
    sleepTimer: null,

    // Actions
    play: async () => {
      await expoAudioService.play();
      set({ isPlaying: true });
    },

    pause: async () => {
      await expoAudioService.pause();
      set({ isPlaying: false });
    },

    seekTo: async (position) => {
      await expoAudioService.seekTo(position);
      set({ position });
    },

    skipForward: async () => {
      await expoAudioService.skipForward(30);
    },

    skipBackward: async () => {
      await expoAudioService.skipBackward(15);
    },

    addToQueue: async (episode) => {
      const track: Track = {
        id: episode.id,
        url: episode.audio_url,
        title: episode.title,
        artist: episode.podcast_title,
        artwork: episode.artwork_url || '',
        duration: episode.duration,
        description: episode.description,
      };

      await expoAudioService.addTrack(track);
      const queue = expoAudioService.getQueue();
      set({ queue });

      if (queue.length === 1) {
        set({ currentTrack: track });
      }

      return track;
    },

    playNext: async (episode) => {
      const track: Track = {
        id: episode.id,
        url: episode.audio_url,
        title: episode.title,
        artist: episode.podcast_title,
        artwork: episode.artwork_url || '',
        duration: episode.duration,
        description: episode.description,
      };

      await expoAudioService.addTrack(track);
      const queue = expoAudioService.getQueue();
      set({ queue });
    },

    playNow: async (episode, startPosition) => {
      const track: Track = {
        id: episode.id,
        url: episode.audio_url,
        title: episode.title,
        artist: episode.podcast_title,
        artwork: episode.artwork_url || '',
        duration: episode.duration,
        description: episode.description,
      };

      await expoAudioService.playTrackNow(track, startPosition);
      const queue = expoAudioService.getQueue();
      set({ queue, currentTrack: track });
    },

    removeFromQueue: async (trackId) => {
      await expoAudioService.removeTrack(trackId);
      const queue = expoAudioService.getQueue();
      set({ queue });
    },

    clearQueue: async () => {
      await expoAudioService.clearQueue();
      set({ queue: [], currentTrack: null });
    },

    setPlaybackRate: async (rate) => {
      await expoAudioService.setRate(rate);
      set({ playbackRate: rate });
    },

    setSleepTimer: (minutes) => {
      set({ sleepTimer: minutes });
    },

    // Internal setters (called by audio service callbacks)
    _setIsPlaying: (isPlaying) => set({ isPlaying }),
    _setIsBuffering: (isBuffering) => set({ isBuffering }),
    _setPosition: (position) => set({ position }),
    _setDuration: (duration) => set({ duration }),
    _setBuffered: (buffered) => set({ buffered }),
    _setCurrentTrack: (track) => set({ currentTrack: track }),
    _setQueue: (queue) => set({ queue }),
  }))
);

// Selectors
export const selectIsPlaying = (state: AudioState) => state.isPlaying;
export const selectCurrentTrack = (state: AudioState) => state.currentTrack;
export const selectPosition = (state: AudioState) => state.position;
export const selectDuration = (state: AudioState) => state.duration;

// Initialize audio service integration
export async function initializeAudioStore() {
  const store = useAudioStore.getState();

  await expoAudioService.initialize();

  // Set up callbacks from audio service to update store
  expoAudioService.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded) {
      store._setIsPlaying(status.isPlaying);
      store._setIsBuffering(status.isBuffering);
      store._setPosition(status.positionMillis / 1000);
      store._setDuration((status.durationMillis || 0) / 1000);
      store._setBuffered((status.playableDurationMillis || 0) / 1000);
    }
  });

  expoAudioService.setOnTrackChange((track) => {
    store._setCurrentTrack(track);
    store._setQueue(expoAudioService.getQueue());
  });
}
```

#### Step 1.2: Update App Layout

**File:** `app/_layout.tsx`

```tsx
// Add to imports
import { initializeAudioStore } from './stores/audioStore';

export default function RootLayout() {
  // ... existing code

  useEffect(() => {
    async function loadFonts() {
      // ... existing font loading

      // Initialize audio store
      await initializeAudioStore();
    }

    loadFonts();
  }, []);

  // Remove AudioProvider from provider tree
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <DatabaseProvider>
            <AuthProvider>
              {/* Remove AudioProvider */}
              <ChaptersProvider>
                <TranscriptProvider>
                  {/* ... rest of tree */}
```

#### Step 1.3: Update Components Using Audio

**Example:** `app/components/MiniPlayer.tsx`

```tsx
// Before
import { useAudio } from '../contexts/AudioContextExpo';

export function MiniPlayer() {
  const { isPlaying, currentTrack, play, pause } = useAudio();
  // ...
}

// After
import { useAudioStore } from '../stores/audioStore';

export function MiniPlayer() {
  const isPlaying = useAudioStore(state => state.isPlaying);
  const currentTrack = useAudioStore(state => state.currentTrack);
  const play = useAudioStore(state => state.play);
  const pause = useAudioStore(state => state.pause);
  // ...
}

// Or with selector for better performance
import { useAudioStore, selectIsPlaying, selectCurrentTrack } from '../stores/audioStore';

export function MiniPlayer() {
  const isPlaying = useAudioStore(selectIsPlaying);
  const currentTrack = useAudioStore(selectCurrentTrack);
  const { play, pause } = useAudioStore();
  // ...
}
```

#### Step 1.4: Find and Update All Audio Context Usage

```bash
# Find all files using useAudio hook
grep -r "useAudio" app/

# Expected files to update:
# - app/components/MiniPlayer.tsx
# - app/(traditional)/podcasts/player.tsx
# - app/components/player/* (multiple files)
# - Any other components using audio
```

#### Step 1.5: Testing

**Test Cases:**
- [ ] Audio playback works correctly
- [ ] Queue management functions
- [ ] Seekbar updates smoothly
- [ ] Sleep timer works
- [ ] Playback rate changes work
- [ ] Background playback continues
- [ ] Notification controls work
- [ ] Progress saving works

**Performance Metrics:**
- Measure re-render count before/after
- Check memory usage
- Verify no audio glitches

#### Step 1.6: Clean Up

- [ ] Delete `app/contexts/AudioContextExpo.tsx`
- [ ] Remove from imports in `_layout.tsx`
- [ ] Update any tests
- [ ] Document new pattern

**Completion Criteria:**
✅ All components migrated
✅ Tests passing
✅ No performance regressions
✅ DevTools showing clean state updates

---

### Phase 2: React Query Setup (Week 1-2 - 3 days)
**Goal:** Configure React Query and create base query hooks

#### Step 2.1: Configure Query Client

**File:** `app/config/queryClient.ts`

```tsx
import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Cache time: how long unused data stays in cache
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.response?.status && error.response.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Network mode for offline-first
      networkMode: 'offlineFirst',

      // Refetch configuration
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 1,
    },
  },
});

// Set up network status listener
let unsubscribeNetInfo: (() => void) | null = null;

export function setupNetworkListener() {
  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected && state.isInternetReachable;

    // When coming back online, refetch active queries
    if (isOnline) {
      queryClient.refetchQueries({ type: 'active' });
    }
  });
}

export function cleanupNetworkListener() {
  unsubscribeNetInfo?.();
}
```

#### Step 2.2: Update App Layout

**File:** `app/_layout.tsx`

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, setupNetworkListener, cleanupNetworkListener } from './config/queryClient';

export default function RootLayout() {
  useEffect(() => {
    setupNetworkListener();

    return () => {
      cleanupNetworkListener();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* ... rest of app */}
    </QueryClientProvider>
  );
}
```

#### Step 2.3: Add React Query DevTools (Development Only)

**File:** `app/_layout.tsx`

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Constants from 'expo-constants';

export default function RootLayout() {
  const isDev = Constants.expoConfig?.extra?.isDevelopment || __DEV__;

  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
      {isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

#### Step 2.4: Create Query Key Factory

**File:** `app/hooks/queries/queryKeys.ts`

```tsx
/**
 * Centralized query key factory
 * Provides type-safe, consistent query keys across the app
 */

export const queryKeys = {
  // Weekly Selections
  weeklySelections: {
    all: ['weeklySelections'] as const,
    lists: () => [...queryKeys.weeklySelections.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.weeklySelections.lists(), filters] as const,
    current: () => [...queryKeys.weeklySelections.all, 'current'] as const,
    userChoices: (userId: string) =>
      [...queryKeys.weeklySelections.all, 'userChoices', userId] as const,
    memberCount: (episodeId: string) =>
      [...queryKeys.weeklySelections.all, 'memberCount', episodeId] as const,
  },

  // Comments
  comments: {
    all: ['comments'] as const,
    lists: () => [...queryKeys.comments.all, 'list'] as const,
    list: (episodeId: string, parentId?: string | null) =>
      [...queryKeys.comments.lists(), episodeId, parentId] as const,
    detail: (commentId: string) =>
      [...queryKeys.comments.all, 'detail', commentId] as const,
    reactions: (commentId: string) =>
      [...queryKeys.comments.all, 'reactions', commentId] as const,
  },

  // Members
  members: {
    all: ['members'] as const,
    lists: () => [...queryKeys.members.all, 'list'] as const,
    stats: () => [...queryKeys.members.all, 'stats'] as const,
  },

  // Meetups
  meetups: {
    all: ['meetups'] as const,
    lists: () => [...queryKeys.meetups.all, 'list'] as const,
    list: (episodeId?: string) =>
      [...queryKeys.meetups.lists(), episodeId] as const,
    upcoming: () => [...queryKeys.meetups.all, 'upcoming'] as const,
    detail: (meetupId: string) =>
      [...queryKeys.meetups.all, 'detail', meetupId] as const,
    attendees: (meetupId: string) =>
      [...queryKeys.meetups.all, 'attendees', meetupId] as const,
  },

  // Podcast Metadata
  podcastMetadata: {
    all: ['podcastMetadata'] as const,
    detail: (episodeId: string) =>
      [...queryKeys.podcastMetadata.all, 'detail', episodeId] as const,
    progress: (episodeId: string) =>
      [...queryKeys.podcastMetadata.all, 'progress', episodeId] as const,
  },

  // Chapters
  chapters: {
    all: ['chapters'] as const,
    list: (episodeId: string) =>
      [...queryKeys.chapters.all, 'list', episodeId] as const,
  },

  // Transcript
  transcript: {
    all: ['transcript'] as const,
    list: (episodeId: string) =>
      [...queryKeys.transcript.all, 'list', episodeId] as const,
  },

  // Profile
  profile: {
    all: ['profile'] as const,
    detail: (userId: string) =>
      [...queryKeys.profile.all, 'detail', userId] as const,
    current: () => [...queryKeys.profile.all, 'current'] as const,
  },

  // Friends
  friends: {
    all: ['friends'] as const,
    lists: () => [...queryKeys.friends.all, 'list'] as const,
    list: (userId: string) =>
      [...queryKeys.friends.lists(), userId] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (userId: string) =>
      [...queryKeys.notifications.lists(), userId] as const,
    unreadCount: (userId: string) =>
      [...queryKeys.notifications.all, 'unreadCount', userId] as const,
  },

  // Discussion
  discussion: {
    all: ['discussion'] as const,
    questions: (episodeId: string) =>
      [...queryKeys.discussion.all, 'questions', episodeId] as const,
    responses: (episodeId: string, userId: string) =>
      [...queryKeys.discussion.all, 'responses', episodeId, userId] as const,
  },
};
```

**Completion Criteria:**
✅ Query client configured
✅ DevTools integrated
✅ Network listener set up
✅ Query key factory created

---

### Phase 3: Weekly Selections Migration (Week 2 - 3 days)
**Goal:** Migrate WeeklySelectionsContext to React Query

This is the most complex data-fetching context, making it a good proving ground.

#### Step 3.1: Create Query Hooks

**File:** `app/hooks/queries/useWeeklySelections.ts`

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { WeeklySelectionRepository } from '@/data/repositories/weekly-selection.repository';
import { EpisodeDetailsRepository } from '@/data/repositories/episode-details.repository';
import type { WeeklyPodcast } from '@/contexts/WeeklySelectionsContext';
import { queryKeys } from './queryKeys';

/**
 * Fetch current week's podcast selections
 */
export function useWeeklySelections() {
  const { database, weeklySelectionRepository, episodeDetailsRepository } = useDatabase();
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.weeklySelections.current(),
    queryFn: async (): Promise<Map<string, WeeklyPodcast>> => {
      // Sync with remote first
      await weeklySelectionRepository.syncWithRemote();
      await episodeDetailsRepository.syncWithRemote();

      // Load current week's selections
      const dbSelections = await weeklySelectionRepository.getCurrentWeekSelections();

      // Transform to WeeklyPodcast format
      const transformed = await Promise.all(
        dbSelections.map(async (selection) => {
          const details = await episodeDetailsRepository.getEpisodeDetails(selection.episodeId);
          const memberCount = await weeklySelectionRepository.getEpisodeMemberCount(selection.episodeId);

          return {
            id: selection.episodeId,
            category: selection.category || 'podcast',
            categoryLabel: getCategoryLabel(selection.category || 'podcast'),
            title: selection.podcastTitle || 'Unknown Podcast',
            source: selection.episodeTitle || 'Unknown Episode',
            clubMembers: memberCount,
            progress: 0,
            duration: formatDuration(selection.duration || 0),
            episode: selection.episodeTitle || 'Unknown Episode',
            image: selection.artworkUrl,
            audioUrl: selection.audioUrl,
            description: selection.episodeDescription,
            about: details?.about,
            whyWeLoveIt: details?.whyWeLoveIt,
          } as WeeklyPodcast;
        })
      );

      // Convert to Map
      const selectionMap = new Map<string, WeeklyPodcast>();
      transformed.forEach(podcast => selectionMap.set(podcast.id, podcast));

      return selectionMap;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!database && !!user,
  });
}

/**
 * Get user's weekly choices
 */
export function useUserWeeklyChoices() {
  const { weeklySelectionRepository } = useDatabase();
  const { user } = useAuth();
  const { data: selections } = useWeeklySelections();

  return useQuery({
    queryKey: queryKeys.weeklySelections.userChoices(user?.id || ''),
    queryFn: async (): Promise<WeeklyPodcast[]> => {
      if (!user?.id) return [];

      const choiceIds = await weeklySelectionRepository.getUserWeeklyChoices(user.id);

      if (!selections) return [];

      // Map choice IDs to podcasts
      const choices = choiceIds
        .map(id => selections.get(id))
        .filter((p): p is WeeklyPodcast => p !== undefined);

      return choices;
    },
    enabled: !!user && !!selections,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Select an episode for the week
 */
export function useSelectEpisode() {
  const queryClient = useQueryClient();
  const { weeklySelectionRepository } = useDatabase();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (episodeId: string): Promise<boolean> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      return await weeklySelectionRepository.saveUserWeeklyChoice(user.id, episodeId);
    },
    onSuccess: (success, episodeId) => {
      if (success) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: queryKeys.weeklySelections.userChoices(user?.id || '')
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.weeklySelections.memberCount(episodeId)
        });

        // Optimistically update the selections to show new member count
        queryClient.invalidateQueries({
          queryKey: queryKeys.weeklySelections.current()
        });
      }
    },
    onError: (error) => {
      console.error('Error selecting episode:', error);
    },
  });
}

/**
 * Get member count for specific episode
 */
export function useEpisodeMemberCount(episodeId: string) {
  const { weeklySelectionRepository } = useDatabase();

  return useQuery({
    queryKey: queryKeys.weeklySelections.memberCount(episodeId),
    queryFn: async (): Promise<number> => {
      return await weeklySelectionRepository.getEpisodeMemberCount(episodeId);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (changes frequently)
    enabled: !!episodeId,
  });
}

// Helper functions
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'comedy': 'Comedy',
    'true-crime': 'True Crime',
    'business': 'Business',
    'health': 'Health & Wellness',
    'technology': 'Technology',
    'history': 'History',
    'society-culture': 'Society & Culture',
  };
  return labels[category] || category;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
```

#### Step 3.2: Update Components

**File:** `app/(tabs)/home.tsx`

```tsx
// Before
import { useWeeklySelections, type WeeklyPodcast } from '@/contexts/WeeklySelectionsContext';

export default function HomeScreen() {
  const { userChoices, userChoice, selections, selectEpisode } = useWeeklySelections();
  // ...
}

// After
import {
  useWeeklySelections,
  useUserWeeklyChoices,
  useSelectEpisode
} from '@/hooks/queries/useWeeklySelections';

export default function HomeScreen() {
  const { data: selections, isLoading: selectionsLoading } = useWeeklySelections();
  const { data: userChoices = [], isLoading: choicesLoading } = useUserWeeklyChoices();
  const selectEpisodeMutation = useSelectEpisode();

  const handleSelectEpisode = async (episodeId: string) => {
    await selectEpisodeMutation.mutateAsync(episodeId);
  };

  // Convert Map to array for display
  const selectionsArray = selections ? Array.from(selections.values()) : [];
  const userChoice = userChoices[0] || null;

  // ...
}
```

#### Step 3.3: Update Other Components Using Weekly Selections

```bash
# Find all files using useWeeklySelections
grep -r "useWeeklySelections" app/

# Expected files:
# - app/(tabs)/home.tsx
# - app/weekly-selection.tsx
# - Any other components using weekly selections
```

#### Step 3.4: Testing

**Test Cases:**
- [ ] Weekly selections load correctly
- [ ] User choices persist
- [ ] Selecting episode updates UI immediately
- [ ] Member counts update after selection
- [ ] Offline selection works (queued for sync)
- [ ] Cache invalidation works correctly
- [ ] Loading states display properly

#### Step 3.5: Remove Old Context

- [ ] Delete `app/contexts/WeeklySelectionsContext.tsx`
- [ ] Remove `<WeeklySelectionsProvider>` from `_layout.tsx`
- [ ] Update imports across codebase

**Completion Criteria:**
✅ All components migrated
✅ Tests passing
✅ No regressions
✅ Context deleted

---

### Phase 4: Comments & Notifications Migration (Week 2-3 - 4 days)
**Goal:** Migrate real-time data contexts

These contexts involve real-time subscriptions, making them slightly more complex.

#### Step 4.1: Comments Query Hooks

**File:** `app/hooks/queries/useComments.ts`

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';
import type { CommentData } from '@/contexts/CommentsContext';

/**
 * Fetch comments for an episode
 * Includes real-time subscription
 */
export function useEpisodeComments(episodeId: string, parentId: string | null = null) {
  const { commentRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.comments.list(episodeId, parentId),
    queryFn: async (): Promise<CommentData[]> => {
      // Sync from remote
      await commentRepository.syncWithRemote(episodeId);

      // Get comments
      const dbComments = await commentRepository.getEpisodeComments(episodeId, parentId);

      // Format comments
      const formattedComments: CommentData[] = await Promise.all(
        dbComments.map(async (comment) => {
          const reactions = await commentRepository.getReactions(comment.id, user?.id);

          let replyCount = 0;
          let replyAvatars: string[] = [];
          if (!parentId) {
            const replies = await commentRepository.getEpisodeComments(episodeId, comment.id);
            replyCount = replies.length;
            replyAvatars = replies
              .slice(0, 3)
              .map(reply => reply.avatarUrl)
              .filter(avatar => avatar != null) as string[];
          }

          return {
            id: comment.id,
            author: comment.username || 'Anonymous',
            avatar: comment.avatarUrl,
            text: comment.content,
            time: formatTimeAgo(comment.createdAt),
            reactions,
            replies: replyCount,
            replyAvatars,
          };
        })
      );

      return formattedComments;
    },
    enabled: !!episodeId && !!commentRepository,
    staleTime: 30 * 1000, // 30 seconds (comments are real-time)
  });
}

/**
 * Submit a new comment
 */
export function useSubmitComment() {
  const queryClient = useQueryClient();
  const { commentRepository } = useDatabase();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      episodeId,
      content,
      parentId
    }: {
      episodeId: string;
      content: string;
      parentId?: string
    }) => {
      if (!user) throw new Error('Not authenticated');

      return await commentRepository.createComment(
        episodeId,
        user.id,
        content,
        parentId
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate comments list
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list(variables.episodeId, variables.parentId || null)
      });

      // If reply, also invalidate parent comment
      if (variables.parentId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.comments.list(variables.episodeId, null)
        });
      }
    },
  });
}

/**
 * Toggle reaction on a comment
 */
export function useToggleReaction() {
  const queryClient = useQueryClient();
  const { commentRepository } = useDatabase();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      commentId,
      emoji,
      episodeId
    }: {
      commentId: string;
      emoji: string;
      episodeId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      return await commentRepository.toggleReaction(commentId, user.id, emoji);
    },
    onMutate: async ({ commentId, emoji, episodeId }) => {
      // Optimistic update
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.all });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData(
        queryKeys.comments.list(episodeId, null)
      );

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.comments.list(episodeId, null),
        (old: CommentData[] | undefined) => {
          if (!old) return old;

          return old.map(comment => {
            if (comment.id === commentId) {
              // Toggle reaction in the comment
              const reactions = comment.reactions || [];
              const existingReaction = reactions.find(r => r.emoji === emoji);

              if (existingReaction) {
                // Remove reaction
                return {
                  ...comment,
                  reactions: reactions.map(r =>
                    r.emoji === emoji
                      ? { ...r, count: Math.max(0, r.count - 1), userReacted: false }
                      : r
                  ).filter(r => r.count > 0),
                };
              } else {
                // Add reaction
                return {
                  ...comment,
                  reactions: [...reactions, { emoji, count: 1, userReacted: true }],
                };
              }
            }
            return comment;
          });
        }
      );

      return { previousComments };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(
          queryKeys.comments.list(variables.episodeId, null),
          context.previousComments
        );
      }
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list(variables.episodeId, null)
      });
    },
  });
}

/**
 * Set up real-time subscription for comments
 * Call this in a component that needs live updates
 */
export function useCommentsSubscription(episodeId: string) {
  const { commentRepository } = useDatabase();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!episodeId || !commentRepository) return;

    // Subscribe to top-level comments
    const subscription = commentRepository
      .observeEpisodeComments(episodeId, null)
      .subscribe(() => {
        // Invalidate query to trigger refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.comments.list(episodeId, null)
        });
      });

    // Subscribe to reactions
    const reactionsSubscription = commentRepository
      .observeAllReactionsForEpisode(episodeId)
      .subscribe(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.comments.list(episodeId, null)
        });
      });

    return () => {
      subscription.unsubscribe();
      reactionsSubscription.unsubscribe();
    };
  }, [episodeId, commentRepository, queryClient, user]);
}

// Helper
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}
```

#### Step 4.2: Notifications Query Hooks

**File:** `app/hooks/queries/useNotifications.ts`

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationService } from '@/services/notification.service';
import { queryKeys } from './queryKeys';
import type Notification from '@/data/models/notification.model';
import { useEffect } from 'react';

/**
 * Fetch user's notifications
 */
export function useNotifications(limit: number = 50) {
  const { database } = useDatabase();
  const { user } = useAuth();
  const [notificationService] = useState(() =>
    database ? new NotificationService(database) : null
  );

  return useQuery({
    queryKey: queryKeys.notifications.list(user?.id || ''),
    queryFn: async (): Promise<Notification[]> => {
      if (!user || !notificationService) return [];

      // Sync from Supabase
      await notificationService.syncNotifications(user.id);

      // Get from local database
      return await notificationService.getNotifications(user.id, limit);
    },
    enabled: !!user && !!notificationService,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get unread notification count
 */
export function useUnreadNotificationCount() {
  const { database } = useDatabase();
  const { user } = useAuth();
  const [notificationService] = useState(() =>
    database ? new NotificationService(database) : null
  );

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(user?.id || ''),
    queryFn: async (): Promise<number> => {
      if (!user || !notificationService) return 0;

      return await notificationService.getUnreadCount(user.id);
    },
    enabled: !!user && !!notificationService,
    staleTime: 30 * 1000,
  });
}

/**
 * Mark notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { database } = useDatabase();
  const { user } = useAuth();
  const [notificationService] = useState(() =>
    database ? new NotificationService(database) : null
  );

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!notificationService) throw new Error('Service not initialized');

      await notificationService.markAsRead(notificationId);
    },
    onMutate: async (notificationId) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.list(user?.id || '')
      });

      const previousNotifications = queryClient.getQueryData(
        queryKeys.notifications.list(user?.id || '')
      );

      // Update notification
      queryClient.setQueryData(
        queryKeys.notifications.list(user?.id || ''),
        (old: Notification[] | undefined) =>
          old?.map(n => n.id === notificationId ? { ...n, isRead: true } as Notification : n)
      );

      // Update count
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(user?.id || ''),
        (old: number | undefined) => Math.max(0, (old || 0) - 1)
      );

      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      // Rollback
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          queryKeys.notifications.list(user?.id || ''),
          context.previousNotifications
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all
      });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { database } = useDatabase();
  const { user } = useAuth();
  const [notificationService] = useState(() =>
    database ? new NotificationService(database) : null
  );

  return useMutation({
    mutationFn: async () => {
      if (!user || !notificationService) {
        throw new Error('User or service not available');
      }

      await notificationService.markAllAsRead(user.id);
    },
    onSuccess: () => {
      // Update all notifications
      queryClient.setQueryData(
        queryKeys.notifications.list(user?.id || ''),
        (old: Notification[] | undefined) =>
          old?.map(n => ({ ...n, isRead: true } as Notification))
      );

      // Update count
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(user?.id || ''),
        0
      );
    },
  });
}

/**
 * Delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { database } = useDatabase();
  const [notificationService] = useState(() =>
    database ? new NotificationService(database) : null
  );

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!notificationService) throw new Error('Service not initialized');

      await notificationService.deleteNotification(notificationId);
    },
    onSuccess: (_, notificationId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all
      });
    },
  });
}

/**
 * Set up real-time subscription for notifications
 */
export function useNotificationsSubscription() {
  const { database } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notificationService] = useState(() =>
    database ? new NotificationService(database) : null
  );

  useEffect(() => {
    if (!user || !notificationService) return;

    // Subscribe to real-time updates
    notificationService.subscribeToNotifications(user.id, () => {
      // Invalidate to trigger refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all
      });
    });

    return () => {
      notificationService.unsubscribe();
    };
  }, [user, notificationService, queryClient]);
}
```

#### Step 4.3: Update Components

**Example:** `app/components/player/CommentsList.tsx`

```tsx
// Before
import { useComments } from '@/contexts/CommentsContext';

export function CommentsList({ episodeId }: Props) {
  const { comments, loading, submitComment, addReaction } = useComments();

  useEffect(() => {
    loadComments(episodeId);
  }, [episodeId]);

  // ...
}

// After
import {
  useEpisodeComments,
  useSubmitComment,
  useToggleReaction,
  useCommentsSubscription
} from '@/hooks/queries/useComments';

export function CommentsList({ episodeId }: Props) {
  const { data: comments = [], isLoading } = useEpisodeComments(episodeId);
  const submitCommentMutation = useSubmitComment();
  const toggleReactionMutation = useToggleReaction();

  // Set up real-time subscription
  useCommentsSubscription(episodeId);

  const handleSubmit = async (content: string) => {
    await submitCommentMutation.mutateAsync({ episodeId, content });
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    await toggleReactionMutation.mutateAsync({ commentId, emoji, episodeId });
  };

  // ...
}
```

#### Step 4.4: Testing

**Test Cases:**
- [ ] Comments load correctly
- [ ] Real-time updates work
- [ ] Submitting comment works
- [ ] Reactions toggle correctly
- [ ] Optimistic updates display immediately
- [ ] Rollback on error works
- [ ] Notifications load correctly
- [ ] Marking as read works
- [ ] Unread count updates

#### Step 4.5: Clean Up

- [ ] Delete `app/contexts/CommentsContext.tsx`
- [ ] Delete `app/contexts/NotificationsContext.tsx`
- [ ] Remove from `_layout.tsx`

**Completion Criteria:**
✅ Comments migrated with real-time support
✅ Notifications migrated with real-time support
✅ Optimistic updates working
✅ Tests passing

---

### Phase 5: Remaining Data Contexts Migration (Week 3-4 - 5 days)
**Goal:** Migrate all remaining data-fetching contexts

Contexts to migrate:
- MembersContext
- MeetupsContext
- TranscriptContext
- ChaptersContext
- ProfileContext
- PodcastMetadataContext
- FriendsContext
- DiscussionContext
- UserResponsesContext

**Pattern to Follow:** Same as Phases 3-4

1. Create query hooks file
2. Update components
3. Test thoroughly
4. Delete old context
5. Remove from `_layout.tsx`

**Files to Create:**
- `app/hooks/queries/useMembers.ts`
- `app/hooks/queries/useMeetups.ts`
- `app/hooks/queries/useTranscript.ts`
- `app/hooks/queries/useChapters.ts`
- `app/hooks/queries/useProfile.ts`
- `app/hooks/queries/usePodcastMetadata.ts`
- `app/hooks/queries/useFriends.ts`
- `app/hooks/queries/useDiscussion.ts`

**Quick Reference Template:**

```tsx
// app/hooks/queries/use[Feature].ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';

export function use[Feature]() {
  const { [repository] } = useDatabase();
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.[feature].list(),
    queryFn: async () => {
      await [repository].syncWithRemote();
      return await [repository].get[Data]();
    },
    enabled: !!user && !![repository],
  });
}

export function useCreate[Feature]() {
  const queryClient = useQueryClient();
  const { [repository] } = useDatabase();

  return useMutation({
    mutationFn: async (data) => {
      return await [repository].create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.[feature].all });
    },
  });
}
```

**Completion Criteria:**
✅ All data contexts migrated
✅ All components updated
✅ Tests passing
✅ Old contexts deleted

---

### Phase 6: Client State with Zustand (Week 4 - 3 days)
**Goal:** Create Zustand stores for remaining client state

#### Step 6.1: Current Podcast Store

**File:** `app/stores/currentPodcastStore.ts`

```tsx
import create from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';

interface CurrentPodcastState {
  currentPodcastId: string | null;
  setCurrentPodcastId: (id: string) => void;
  clearCurrentPodcast: () => void;
}

export const useCurrentPodcastStore = create<CurrentPodcastState>()(
  persist(
    (set) => ({
      currentPodcastId: null,

      setCurrentPodcastId: (id) => {
        set({ currentPodcastId: id });
      },

      clearCurrentPodcast: () => {
        set({ currentPodcastId: null });
      },
    }),
    {
      name: 'current-podcast-storage',
      getStorage: () => AsyncStorage,
    }
  )
);
```

#### Step 6.2: UI State Store

**File:** `app/stores/uiStore.ts`

```tsx
import create from 'zustand';

interface UIState {
  // Modals
  showDiscussionFlow: boolean;
  showPollReview: boolean;
  showProfileMenu: boolean;
  showNotifications: boolean;

  // Actions
  setShowDiscussionFlow: (show: boolean) => void;
  setShowPollReview: (show: boolean) => void;
  setShowProfileMenu: (show: boolean) => void;
  setShowNotifications: (show: boolean) => void;

  // Helpers
  closeAllModals: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showDiscussionFlow: false,
  showPollReview: false,
  showProfileMenu: false,
  showNotifications: false,

  setShowDiscussionFlow: (show) => set({ showDiscussionFlow: show }),
  setShowPollReview: (show) => set({ showPollReview: show }),
  setShowProfileMenu: (show) => set({ showProfileMenu: show }),
  setShowNotifications: (show) => set({ showNotifications: show }),

  closeAllModals: () => set({
    showDiscussionFlow: false,
    showPollReview: false,
    showProfileMenu: false,
    showNotifications: false,
  }),
}));
```

#### Step 6.3: Migrate InitialSyncContext

This context orchestrates initial data loading. Replace with a combination of React Query and Zustand.

**File:** `app/stores/syncStore.ts`

```tsx
import create from 'zustand';

interface SyncState {
  isInitialSyncComplete: boolean;
  syncProgress: number;
  syncStatus: 'idle' | 'syncing' | 'complete' | 'error';
  syncError: string | null;

  setInitialSyncComplete: (complete: boolean) => void;
  setSyncProgress: (progress: number) => void;
  setSyncStatus: (status: SyncState['syncStatus']) => void;
  setSyncError: (error: string | null) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isInitialSyncComplete: false,
  syncProgress: 0,
  syncStatus: 'idle',
  syncError: null,

  setInitialSyncComplete: (complete) => set({ isInitialSyncComplete: complete }),
  setSyncProgress: (progress) => set({ syncProgress: progress }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setSyncError: (error) => set({ syncError: error }),

  reset: () => set({
    isInitialSyncComplete: false,
    syncProgress: 0,
    syncStatus: 'idle',
    syncError: null,
  }),
}));
```

**File:** `app/hooks/useInitialSync.ts`

```tsx
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSyncStore } from '@/stores/syncStore';
import { queryKeys } from './queries/queryKeys';

/**
 * Orchestrates initial data sync
 */
export function useInitialSync() {
  const queryClient = useQueryClient();
  const {
    isInitialSyncComplete,
    setSyncStatus,
    setSyncProgress,
    setInitialSyncComplete,
    setSyncError
  } = useSyncStore();

  useEffect(() => {
    if (isInitialSyncComplete) return;

    async function performInitialSync() {
      setSyncStatus('syncing');
      setSyncProgress(0);

      try {
        // Prefetch critical data
        const criticalQueries = [
          queryClient.prefetchQuery({
            queryKey: queryKeys.weeklySelections.current()
          }),
          queryClient.prefetchQuery({
            queryKey: queryKeys.profile.current()
          }),
        ];

        await Promise.all(criticalQueries);
        setSyncProgress(50);

        // Prefetch secondary data
        const secondaryQueries = [
          queryClient.prefetchQuery({
            queryKey: queryKeys.members.stats()
          }),
          queryClient.prefetchQuery({
            queryKey: queryKeys.notifications.unreadCount('')
          }),
        ];

        await Promise.all(secondaryQueries);
        setSyncProgress(100);

        setSyncStatus('complete');
        setInitialSyncComplete(true);
      } catch (error) {
        console.error('Initial sync failed:', error);
        setSyncError(error instanceof Error ? error.message : 'Sync failed');
        setSyncStatus('error');
      }
    }

    performInitialSync();
  }, [isInitialSyncComplete]);

  return {
    isInitialSyncComplete,
    syncStatus: useSyncStore(state => state.syncStatus),
    syncProgress: useSyncStore(state => state.syncProgress),
    syncError: useSyncStore(state => state.syncError),
  };
}
```

**Completion Criteria:**
✅ Client state stores created
✅ InitialSync migrated to React Query prefetching
✅ UI state managed by Zustand
✅ CurrentPodcast stored with persistence

---

### Phase 7: Final Cleanup & Optimization (Week 4-5 - 3 days)
**Goal:** Clean up, optimize, and finalize migration

#### Step 7.1: Update App Layout (Final)

**File:** `app/_layout.tsx`

```tsx
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './contexts/AuthContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { useEffect, useState } from 'react';
import { playbackService } from './services/playback/playback.service';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';
import { Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { SplashScreen as CustomSplashScreen } from './components/SplashScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { errorTrackingService } from './services/errorTracking/errorTrackingService';
import { queryClient, setupNetworkListener, cleanupNetworkListener } from './config/queryClient';
import { initializeAudioStore } from './stores/audioStore';
import Constants from 'expo-constants';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const isDev = Constants.expoConfig?.extra?.isDevelopment || __DEV__;

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          PaytoneOne_400Regular,
          Caveat_400Regular,
          Caveat_700Bold,
          GrandBold: require('../assets/fonts/GrandBold.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true);
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    loadFonts();

    // Initialize services
    playbackService.initialize().catch(console.error);
    errorTrackingService.initialize().catch(console.error);
    initializeAudioStore().catch(console.error);
    setupNetworkListener();

    return () => {
      playbackService.destroy().catch(console.error);
      errorTrackingService.stopBackgroundSync();
      cleanupNetworkListener();
    };
  }, []);

  if (!fontsLoaded || showCustomSplash) {
    if (!fontsLoaded) {
      return null;
    }
    return <CustomSplashScreen onFinish={() => setShowCustomSplash(false)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <DatabaseProvider>
            <AuthProvider>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(traditional)" options={{ headerShown: false }} />
                <Stack.Screen name="admin" options={{ headerShown: false }} />
                <Stack.Screen name="splash-preview" options={{ headerShown: false }} />
                <Stack.Screen name="podcast-details" options={{ headerShown: false }} />
                <Stack.Screen name="player" options={{ headerShown: false }} />
                <Stack.Screen name="profile" options={{ headerShown: false }} />
                <Stack.Screen name="verify-phone" options={{ headerShown: false }} />
                <Stack.Screen name="success" options={{ headerShown: false }} />
                <Stack.Screen name="episode-complete" options={{ headerShown: false }} />
                <Stack.Screen name="pick-another" options={{ headerShown: false }} />
              </Stack>
            </AuthProvider>
          </DatabaseProvider>
          {isDev && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
```

**From 17 providers to 3 providers!**

#### Step 7.2: Add Index File for Hooks

**File:** `app/hooks/queries/index.ts`

```tsx
// Weekly Selections
export * from './useWeeklySelections';

// Comments
export * from './useComments';

// Notifications
export * from './useNotifications';

// Members
export * from './useMembers';

// Meetups
export * from './useMeetups';

// Transcript
export * from './useTranscript';

// Chapters
export * from './useChapters';

// Profile
export * from './useProfile';

// Podcast Metadata
export * from './usePodcastMetadata';

// Friends
export * from './useFriends';

// Discussion
export * from './useDiscussion';

// Query keys
export { queryKeys } from './queryKeys';
```

**File:** `app/stores/index.ts`

```tsx
export * from './audioStore';
export * from './currentPodcastStore';
export * from './uiStore';
export * from './syncStore';
```

#### Step 7.3: Performance Optimization

1. **Add Query Prefetching on Navigation**

```tsx
// app/(tabs)/home.tsx
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries';

export default function HomeScreen() {
  const queryClient = useQueryClient();

  const handleNavigateToPlayer = (episodeId: string) => {
    // Prefetch data before navigation
    queryClient.prefetchQuery({
      queryKey: queryKeys.chapters.list(episodeId),
    });
    queryClient.prefetchQuery({
      queryKey: queryKeys.transcript.list(episodeId),
    });
    queryClient.prefetchQuery({
      queryKey: queryKeys.comments.list(episodeId, null),
    });

    router.push('/player');
  };

  // ...
}
```

2. **Optimize Query Selectors**

```tsx
// Instead of this (re-renders on any audio state change):
const audioState = useAudioStore();

// Do this (only re-renders when isPlaying changes):
const isPlaying = useAudioStore(state => state.isPlaying);
```

3. **Add Query Persistence for Offline**

```tsx
// app/config/queryClient.ts
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

const persister = createSyncStoragePersister({
  storage: AsyncStorage,
});

// Use in _layout.tsx:
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{ persister }}
>
  {/* App */}
</PersistQueryClientProvider>
```

#### Step 7.4: Documentation

Create documentation for the new patterns:

**File:** `docs/QUERY_HOOKS_GUIDE.md`

```markdown
# Query Hooks Guide

## Creating a New Query Hook

1. Define query keys in `queryKeys.ts`
2. Create hook file in `app/hooks/queries/use[Feature].ts`
3. Export from `app/hooks/queries/index.ts`

## Example

...
```

**File:** `docs/ZUSTAND_STORES_GUIDE.md`

```markdown
# Zustand Stores Guide

## When to Use Zustand

Use Zustand for:
- UI state (modals, forms)
- Client-only state
- Ephemeral state
- Derived computations

## Creating a Store

...
```

#### Step 7.5: Add ESLint Rules

**File:** `.eslintrc.js`

```js
module.exports = {
  // ... existing rules
  rules: {
    // Warn about using old context imports
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/contexts/*Context*'],
            message: 'Use React Query hooks or Zustand stores instead. Only AuthContext and DatabaseContext are allowed.',
          },
        ],
      },
    ],
  },
};
```

**Completion Criteria:**
✅ Final provider tree configured (3 providers)
✅ Performance optimizations applied
✅ Documentation created
✅ ESLint rules added
✅ All old contexts deleted

---

## Timeline & Milestones

### Week 1: Foundation & Audio
- **Days 1-2:** Phase 0 - Preparation
- **Days 3-5:** Phase 1 - Audio Migration
- **Milestone:** Audio playback working with Zustand

### Week 2: React Query Setup & Data Migration
- **Days 1-2:** Phase 2 - React Query Setup
- **Days 3-5:** Phase 3 - Weekly Selections Migration
- **Milestone:** React Query configured, first data context migrated

### Week 3: Real-Time & Batch Migration
- **Days 1-2:** Phase 4 - Comments & Notifications
- **Days 3-5:** Phase 5 - Remaining Contexts (start)
- **Milestone:** Real-time subscriptions working with React Query

### Week 4: Completion & Client State
- **Days 1-3:** Phase 5 - Remaining Contexts (finish)
- **Days 4-5:** Phase 6 - Client State with Zustand
- **Milestone:** All data contexts migrated

### Week 5: Polish & Launch
- **Days 1-3:** Phase 7 - Final Cleanup & Optimization
- **Days 4-5:** Testing, documentation, team training
- **Milestone:** Migration complete, ready for production

**Total Duration:** 5 weeks
**Buffer:** 1 week for unexpected issues

---

## Risk Assessment & Mitigation

### High Risk Items

#### 1. Breaking Real-Time Subscriptions
**Risk:** WatermelonDB observables may not integrate smoothly with React Query

**Mitigation:**
- Test subscription pattern in Phase 2 with Weekly Selections
- Use `queryClient.invalidateQueries()` triggered by observable subscriptions
- Implement custom `useSyncedQuery` hook if needed:

```tsx
function useSyncedQuery(queryKey, queryFn, observable) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = observable.subscribe(() => {
      queryClient.invalidateQueries({ queryKey });
    });

    return () => subscription.unsubscribe();
  }, []);

  return useQuery({ queryKey, queryFn });
}
```

#### 2. Performance Regression
**Risk:** New architecture might have unexpected performance issues

**Mitigation:**
- Benchmark before migration (use React DevTools Profiler)
- Monitor re-render counts during migration
- Use Zustand selectors properly to avoid unnecessary re-renders
- Implement proper memoization in components

#### 3. Data Loss During Migration
**Risk:** Bugs in migration could cause data loss

**Mitigation:**
- WatermelonDB remains source of truth (no data loss risk there)
- Test migrations in development thoroughly
- Create database backups before production rollout
- Implement gradual rollout with feature flags

#### 4. Team Adoption
**Risk:** Team unfamiliar with React Query/Zustand patterns

**Mitigation:**
- Create comprehensive documentation
- Hold training sessions
- Pair programming during initial phases
- Code review all query hooks

### Medium Risk Items

#### 5. Incomplete Migration
**Risk:** Some components still using old contexts

**Mitigation:**
- Maintain checklist of all components using each context
- Add ESLint rule to prevent importing old contexts
- Use grep to find remaining usages before deleting contexts

#### 6. Test Coverage Gaps
**Risk:** Tests may break during migration

**Mitigation:**
- Update tests incrementally with each phase
- Use React Query's testing utilities
- Create test helpers for common patterns

### Low Risk Items

#### 7. Bundle Size Increase
**Risk:** Adding React Query might increase bundle size

**Mitigation:**
- React Query is well-optimized (~13kb gzipped)
- Removing context code will offset this
- Use bundle analyzer to monitor

---

## Testing Strategy

### Unit Testing

**Test Query Hooks:**

```tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWeeklySelections } from '@/hooks/queries/useWeeklySelections';

describe('useWeeklySelections', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('fetches weekly selections', async () => {
    const { result } = renderHook(() => useWeeklySelections(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
  });
});
```

**Test Zustand Stores:**

```tsx
import { renderHook, act } from '@testing-library/react-native';
import { useAudioStore } from '@/stores/audioStore';

describe('audioStore', () => {
  it('plays audio', async () => {
    const { result } = renderHook(() => useAudioStore());

    await act(async () => {
      await result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);
  });
});
```

### Integration Testing

Test key user flows:
- [ ] User selects weekly podcast
- [ ] User plays audio
- [ ] User comments on episode
- [ ] User receives notification
- [ ] Offline sync works

### Performance Testing

**Before Migration Baseline:**
```bash
# Measure initial render time
# Count re-renders
# Check memory usage
```

**After Migration Comparison:**
- Re-render count should decrease by 30-40%
- Initial load time should improve
- Memory usage should be similar or better

**Tools:**
- React DevTools Profiler
- Flipper
- React Native Performance Monitor

---

## Rollback Plan

### Phase-Level Rollback

Each phase is independent, allowing rollback to previous phase if issues arise:

**If Phase 1 fails:**
- Keep `AudioContextExpo.tsx`
- Delete `audioStore.ts`
- Revert `_layout.tsx` changes

**If Phase 3+ fails:**
- Keep old context files
- Delete new query hooks
- Revert component changes

### Feature Flag Rollback

Implement feature flags for gradual rollout:

```tsx
// app/config/featureFlags.ts
export const FEATURE_FLAGS = {
  useNewStateManagement: __DEV__ ? true : false, // Enable in dev only initially
};

// In components:
if (FEATURE_FLAGS.useNewStateManagement) {
  // Use React Query hooks
} else {
  // Use old Context
}
```

**Rollout Strategy:**
1. Week 1-4: Development only
2. Week 5: 10% of production users
3. Week 6: 50% of production users
4. Week 7: 100% of production users

### Emergency Rollback

If critical bugs found in production:

1. Revert `_layout.tsx` to use all old contexts
2. Keep query hooks and stores (they're additive, not breaking)
3. Deploy hotfix
4. Investigate issues in development

**Rollback SLA:** < 2 hours

---

## Success Metrics

### Performance Metrics

**Target Improvements:**
- [ ] 30-40% reduction in unnecessary re-renders
- [ ] 20-30% faster initial load time
- [ ] 10-15% reduction in memory usage
- [ ] Smoother animations (60fps maintained)

**Measurement Tools:**
- React DevTools Profiler
- React Native Performance Monitor
- Firebase Performance Monitoring

### Code Quality Metrics

**Target Improvements:**
- [ ] 60% reduction in state management code (2,940 → ~1,200 lines)
- [ ] 82% reduction in provider nesting (17 → 3 providers)
- [ ] 50% reduction in test setup code
- [ ] 100% type safety maintained

### Developer Experience Metrics

**Target Improvements:**
- [ ] Faster feature development (survey after 1 month)
- [ ] Easier debugging (survey after 1 month)
- [ ] Better DevTools integration
- [ ] Clearer code patterns

### User Experience Metrics

**Must Maintain:**
- [ ] No regressions in app functionality
- [ ] No increase in crash rate
- [ ] No increase in support tickets
- [ ] User retention maintained

---

## Post-Migration Tasks

### Week 6: Monitoring & Optimization

- [ ] Monitor production metrics
- [ ] Gather team feedback
- [ ] Optimize slow queries
- [ ] Add more query prefetching

### Week 7: Documentation & Training

- [ ] Finalize documentation
- [ ] Record video tutorials
- [ ] Hold team Q&A session
- [ ] Update onboarding docs for new developers

### Ongoing: Maintenance

- [ ] Review React Query DevTools regularly
- [ ] Update query cache strategies as needed
- [ ] Monitor bundle size
- [ ] Keep libraries updated

---

## Additional Resources

### React Query Resources
- [React Query Docs](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Offline Support Guide](https://tanstack.com/query/latest/docs/react/guides/offline)

### Zustand Resources
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions)
- [Zustand DevTools](https://docs.pmnd.rs/zustand/integrations/devtools)

### Migration Examples
- [Context to React Query Migration](https://tkdodo.eu/blog/react-query-as-a-state-manager)
- [WatermelonDB + React Query](https://watermelondb.dev/docs/Advanced/Sync)

---

## Conclusion

This migration represents a significant architectural improvement that will:

1. **Improve Performance:** Reduce re-renders and improve responsiveness
2. **Enhance Developer Experience:** Clearer patterns, better tools, less boilerplate
3. **Increase Maintainability:** Separation of concerns, easier testing
4. **Enable Scalability:** Better foundation for future features

The incremental, phase-based approach minimizes risk while delivering value at each stage. With proper testing and monitoring, this migration can be completed successfully in 5 weeks.

**Next Steps:**
1. Review this plan with the team
2. Set up project tracking (e.g., Jira, GitHub Projects)
3. Begin Phase 0 preparation
4. Schedule weekly check-ins to review progress

Good luck with the migration! 🚀
