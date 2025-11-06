# Discussion/Poll Feature Migration Plan
## From Multiple Contexts to React Query + Zustand

**Feature:** Discussion questions/polls with progress tracking
**Current Files:** 3 contexts, 6 components, 1 service, 1 repository
**Target:** React Query hooks + 1 Zustand store
**Estimated Time:** 3-4 days

---

## Current Architecture Problems

### 1. **Triple Context Duplication**

You have **THREE separate contexts** managing the same discussion feature:

```tsx
// DiscussionContext.tsx - Creates service instances
discussionService = new DiscussionService(database);
discussionRepository = new DiscussionRepository(database);

// UserResponsesContext.tsx - Creates THE SAME instances AGAIN!
discussionService = new DiscussionService(database);  // Duplicate!
discussionRepository = new DiscussionRepository(database);  // Duplicate!

// CurrentPodcastContext.tsx - Uses both contexts
const { discussionRepository, discussionService } = useUserResponses();
// Then calls methods and manages derived state
```

**Problem:** Two service instances fighting over the same cache, duplicate memory usage, confusing API.

### 2. **Complex Data Dependencies**

```
Current Podcast Section (UI)
  ↓
CurrentPodcastContext (derived state: pollProgress, isPollCompleted)
  ↓
UserResponsesContext (actions: saveResponse, clearResponses)
  ↓ creates
DiscussionService
  ↓ has
Manual cache (Map<episodeId, timestamp>)
  ↓ calls
DiscussionRepository
  ↓ queries
WatermelonDB + Observables
```

**Every level adds complexity**, yet they're all managing the same data!

###3. **Manual Subscription Management**

```tsx
// CurrentPodcastContext.tsx:119-150
const subscription = discussionRepository
  .observeUserResponsesForEpisode(user.id, currentPodcastId)
  .subscribe({
    next: async (responsesMap) => {
      // When responses change, manually recalculate
      const pollProgressData = await discussionService.getPollProgress(...);
      setViewModel((prev) => ({
        ...prev,
        pollProgress: episodePollProgress.progress,
        isPollCompleted: episodePollProgress.isCompleted,
      }));
    },
  });

return () => subscription.unsubscribe();
```

**Problem:** Manual subscription management, manual cache invalidation, error-prone cleanup.

### 4. **Scattered Data Fetching**

Different components fetch the same data independently:

| Component | What it fetches | Method |
|-----------|-----------------|--------|
| `DiscussionTopicsStack` | Unanswered questions | `getUnansweredQuestions()` |
| `DiscussionTopicsStack` | Question stats | `getQuestionStats()` |
| `PollReviewAllResults` | All questions + results | `useEpisodeDiscussion()` hook |
| `CurrentPodcastContext` | Poll progress | `getPollProgress()` |
| `CurrentPodcastSection` | Derived progress | From CurrentPodcastContext |

**No shared cache!** Each component triggers its own sync.

### 5. **Manual Cache with TTL**

```tsx
// discussion.service.ts:35-68
private syncCache: Map<string, number> = new Map();
private readonly SYNC_CACHE_DURATION = 30000; // 30 seconds

private shouldSync(episodeId: string): boolean {
  const lastSync = this.syncCache.get(episodeId);
  if (!lastSync) return true;
  return Date.now() - lastSync > this.SYNC_CACHE_DURATION;
}
```

**Problem:** Reinventing React Query's built-in caching logic!

---

## Target Architecture

### New Data Flow

```
Components
  ↓ hooks
React Query (in-memory cache)
  ↓ query functions
DiscussionService (thin wrapper)
  ↓
DiscussionRepository (WatermelonDB)
  ↓ observables
WatermelonDB (SQLite)
  ↓ sync
Supabase
```

**Benefits:**
- ✅ Single source of truth for cache
- ✅ Automatic cache invalidation
- ✅ Request deduplication
- ✅ Optimistic updates
- ✅ Real-time subscriptions via React Query

### File Structure

**Delete:**
- ❌ `app/contexts/DiscussionContext.tsx` (92 lines)
- ❌ `app/contexts/UserResponsesContext.tsx` (129 lines)
- ❌ `app/contexts/CurrentPodcastContext.tsx` (193 lines)

**Total deleted: 414 lines**

**Create:**
- ✅ `app/hooks/queries/useDiscussion.ts` (~200 lines)
- ✅ `app/stores/currentPodcastStore.ts` (~50 lines - already exists, enhance it)

**Total added: ~250 lines**

**Net reduction: 164 lines (40%)**

---

## Step-by-Step Migration

### Step 1: Create React Query Hooks

**File:** `app/hooks/queries/useDiscussion.ts`

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { DiscussionService } from '@/services/discussion.service';
import { DiscussionRepository } from '@/data/repositories/discussion.repository';
import { queryKeys } from './queryKeys';
import { useEffect, useMemo, useRef } from 'react';

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

    const subscription = discussionRepository
      .observeUserResponsesForEpisode(user.id, episodeId)
      .subscribe({
        next: (responsesMap) => {
          console.log('[useUserDiscussionResponses] Observable fired! Invalidating query');
          // When WatermelonDB observable fires, invalidate React Query cache
          queryClient.invalidateQueries({
            queryKey: queryKeys.discussion.responses(episodeId, user.id)
          });
        },
        error: (err) => {
          console.error('[useUserDiscussionResponses] Observable error:', err);
        },
      });

    return () => {
      console.log('[useUserDiscussionResponses] Cleaning up subscription');
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
    staleTime: 30 * 1000, // 30 seconds
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
      await discussionService.saveAllResponses(user.id, questionId, agreedValues, allOptionValues);
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
    onSuccess: (_, { episodeId }) => {
      console.log('[useSaveDiscussionResponse] Response saved successfully');

      // Invalidate related queries
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
    onSuccess: (_, { episodeId }) => {
      console.log('[useClearDiscussionResponses] Responses cleared successfully');

      // Invalidate all related queries
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
```

### Step 2: Add Query Keys

**File:** `app/hooks/queries/queryKeys.ts`

Add to existing queryKeys:

```tsx
export const queryKeys = {
  // ... existing keys

  // Discussion
  discussion: {
    all: ['discussion'] as const,
    questions: (episodeId: string) =>
      [...queryKeys.discussion.all, 'questions', episodeId] as const,
    responses: (episodeId: string, userId: string) =>
      [...queryKeys.discussion.all, 'responses', episodeId, userId] as const,
    progress: (episodeId: string, userId: string) =>
      [...queryKeys.discussion.all, 'progress', episodeId, userId] as const,
    unanswered: (episodeId: string, userId: string) =>
      [...queryKeys.discussion.all, 'unanswered', episodeId, userId] as const,
    questionStats: (questionId: string) =>
      [...queryKeys.discussion.all, 'stats', questionId] as const,
  },
};
```

### Step 3: Enhance Current Podcast Store

**File:** `app/stores/currentPodcastStore.ts`

```tsx
import create from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CurrentPodcastState {
  // Persisted
  currentPodcastId: string | null;

  // Actions
  setCurrentPodcastId: (id: string | null) => void;
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

**Note:** This is simpler than the current `CurrentPodcastContext` because React Query hooks handle all the data fetching and derived state!

### Step 4: Update CurrentPodcastSection

**File:** `app/components/CurrentPodcastSection.tsx`

**Before:**
```tsx
import { useCurrentPodcast } from '../contexts/CurrentPodcastContext';

export default function CurrentPodcastSection({
  onPollCompletePress,
  onPollReviewPress,
  pollProgress,
  isPollCompleted,
}: Props) {
  // Props passed from parent who calls useCurrentPodcast()
```

**After:**
```tsx
import { usePollProgress } from '../hooks/queries/useDiscussion';
import { useCurrentPodcastStore } from '../stores/currentPodcastStore';

export default function CurrentPodcastSection({
  podcasts,
  onPodcastPress,
  getProgressForEpisode,
  onPollCompletePress,
  onPollReviewPress,
  onPoddleboxPress,
}: CurrentPodcastSectionProps) {
  // Get current podcast ID from store
  const currentPodcastId = useCurrentPodcastStore(state => state.currentPodcastId);

  // Determine which podcast to show (first in list, or current if set)
  const podcast = currentPodcastId
    ? podcasts.find(p => p.id === currentPodcastId) || podcasts[0]
    : podcasts[0];

  // Fetch poll progress for this podcast
  const { data: pollProgressData, isLoading: pollLoading } = usePollProgress(
    podcast?.id || ''
  );

  const pollProgress = pollProgressData?.progress || 0;
  const isPollCompleted = pollProgressData?.isCompleted || false;

  if (!podcast) return null;

  // ... rest of component (no changes to UI)
}
```

**Changes:**
- ✅ No more prop drilling of `pollProgress` and `isPollCompleted`
- ✅ Component fetches its own data
- ✅ Automatic cache management
- ✅ Automatic real-time updates

### Step 5: Update home.tsx

**File:** `app/(tabs)/home.tsx`

**Before:**
```tsx
import { useCurrentPodcast } from '../contexts/CurrentPodcastContext';

export default function HomeScreen() {
  const {
    currentPodcastId,
    viewModel: currentPodcastViewModel,
    setCurrentPodcastId,
  } = useCurrentPodcast();

  // ... lots of effects managing currentPodcastId

  <CurrentPodcastSection
    podcasts={orderedUserChoices}
    onPodcastPress={handlePodcastPress}
    getProgressForEpisode={getProgressForEpisode}
    onPollCompletePress={handlePollPress}
    onPollReviewPress={handlePollReviewPress}
    onPoddleboxPress={handlePoddleboxPress}
    pollProgress={currentPodcastViewModel.pollProgress}  // Prop drilling
    isPollCompleted={currentPodcastViewModel.isPollCompleted}  // Prop drilling
  />
}
```

**After:**
```tsx
import { useCurrentPodcastStore } from '../stores/currentPodcastStore';

export default function HomeScreen() {
  const { currentPodcastId, setCurrentPodcastId } = useCurrentPodcastStore();

  // ... simplified logic (no more manual viewModel management!)

  <CurrentPodcastSection
    podcasts={orderedUserChoices}
    onPodcastPress={handlePodcastPress}
    getProgressForEpisode={getProgressForEpisode}
    onPollCompletePress={handlePollPress}
    onPollReviewPress={handlePollReviewPress}
    onPoddleboxPress={handlePoddleboxPress}
    // No more pollProgress/isPollCompleted props!
  />
}
```

**Changes:**
- ✅ Removed `useCurrentPodcast()` context
- ✅ Removed prop drilling of poll data
- ✅ Simpler component logic

### Step 6: Update DiscussionTopicsStack

**File:** `app/components/DiscussionTopicsStack.tsx`

**Before:**
```tsx
import { useDiscussion } from '../contexts/DiscussionContext';
import { useUserResponses } from '../contexts/UserResponsesContext';

export function DiscussionTopicsStack({ episodeId, topics, ... }: Props) {
  const { getUnansweredQuestions, getQuestionStats } = useDiscussion();
  const { saveResponse } = useUserResponses();

  // Manual state management
  const [questionStats, setQuestionStats] = useState<Record<string, TopicResults[]>>({});

  // Manual data loading
  useEffect(() => {
    const loadQuestionData = async () => {
      const stats = await getQuestionStats(currentTopic.id);
      setQuestionStats(...);
    };
    loadQuestionData();
  }, [currentTopic, justAnsweredQuestionId]);

  const handleSwipe = async (selected: boolean) => {
    // ... swipe logic
    await saveResponse(currentTopic.id, episodeId, newSelectedOptions, newDisagreedOptions);
    setJustAnsweredQuestionId(currentTopic.id);
  };
}
```

**After:**
```tsx
import { useSaveDiscussionResponse, useQuestionStats } from '../hooks/queries/useDiscussion';

export function DiscussionTopicsStack({ episodeId, topics, ... }: Props) {
  const saveResponseMutation = useSaveDiscussionResponse();

  // Get stats for current question (automatically cached!)
  const currentTopic = topics[currentQuestionIndex];
  const { data: stats = [] } = useQuestionStats(currentTopic?.id || '');

  // Convert stats to TopicResults format
  const results: TopicResults[] = useMemo(() => {
    if (!currentTopic) return [];

    return currentTopic.options.map((option) => {
      const optionStat = stats.find((s) => s.optionValue === option.value);
      const totalResponses = (optionStat?.agreeCount || 0) + (optionStat?.disagreeCount || 0);
      const agreeCount = optionStat?.agreeCount || 0;
      const percentage = totalResponses > 0 ? (agreeCount / totalResponses) * 100 : 0;

      return {
        value: option.value,
        label: option.label,
        count: agreeCount,
        percentage,
        userSelected: selectedOptions.includes(option.value),
      };
    });
  }, [currentTopic, stats, selectedOptions]);

  const handleSwipe = async (selected: boolean) => {
    // ... swipe logic

    // Save response using mutation
    await saveResponseMutation.mutateAsync({
      questionId: currentTopic.id,
      episodeId,
      agreedValues: newSelectedOptions,
      disagreedValues: newDisagreedOptions,
    });

    setJustAnsweredQuestionId(currentTopic.id);
  };

  // Show results when we just answered
  const showResults = justAnsweredQuestionId === currentTopic?.id;

  return (
    <View>
      {!showResults ? (
        // ... swipe cards
      ) : (
        // Results view - use `results` computed from stats
        <View>
          {results.map((result) => (
            // ... result bars
          ))}
        </View>
      )}
    </View>
  );
}
```

**Changes:**
- ✅ Removed manual state management for `questionStats`
- ✅ Removed manual useEffect for loading stats
- ✅ React Query automatically fetches and caches stats
- ✅ Mutation handles optimistic updates
- ✅ Automatic cache invalidation on save

### Step 7: Update PollReviewAllResults

**File:** `app/components/PollReviewAllResults.tsx`

**Before:**
```tsx
import { useEpisodeDiscussion } from '../hooks/useEpisodeDiscussion';  // Custom hook
import { useUserResponses } from '../contexts/UserResponsesContext';

export function PollReviewAllResults({ episodeId, ... }: Props) {
  const { pollResults: questions, loading, refreshData } = useEpisodeDiscussion(episodeId);
  const { clearResponses } = useUserResponses();

  const handleClearAnswers = async (questionId: string) => {
    await clearResponses(questionId, episodeId);
    await refreshData();  // Manual refresh
    onClose();
    setTimeout(() => onOpenDiscussionFlow?.(), 100);
  };
}
```

**After:**
```tsx
import {
  useDiscussionQuestions,
  useUserDiscussionResponses,
  useClearDiscussionResponses
} from '../hooks/queries/useDiscussion';

export function PollReviewAllResults({ episodeId, ... }: Props) {
  // Fetch questions and responses separately (better caching)
  const { data: questions = [], isLoading: questionsLoading } = useDiscussionQuestions(episodeId);
  const { data: responsesMap = {}, isLoading: responsesLoading } = useUserDiscussionResponses(episodeId);
  const clearResponsesMutation = useClearDiscussionResponses();

  const loading = questionsLoading || responsesLoading;

  // Combine questions with user responses for display
  const questionsWithResponses = useMemo(() => {
    return questions.map((question) => {
      const responses = responsesMap[question.id] || { agreed: [], disagreed: [] };

      return {
        questionId: question.id,
        question: question.question,
        options: question.options.map((option) => ({
          value: option.value,
          label: option.label,
          userAgreed: responses.agreed.includes(option.value),
          userDisagreed: responses.disagreed.includes(option.value),
          // Add stats later if needed
        })),
      };
    });
  }, [questions, responsesMap]);

  const handleClearAnswers = async (questionId: string) => {
    try {
      // Clear responses - React Query will auto-invalidate!
      await clearResponsesMutation.mutateAsync({ questionId, episodeId });

      // No manual refresh needed - React Query handles it!
      onClose();
      setTimeout(() => onOpenDiscussionFlow?.(), 100);
    } catch (error) {
      console.error('Failed to clear answers:', error);
    }
  };

  // ... rest of component uses questionsWithResponses
}
```

**Changes:**
- ✅ Removed custom `useEpisodeDiscussion` hook
- ✅ Use granular React Query hooks for better caching
- ✅ No manual `refreshData()` - React Query auto-invalidates
- ✅ Clearer data dependencies

### Step 8: Remove Old Contexts

Delete these files:
- ❌ `app/contexts/DiscussionContext.tsx`
- ❌ `app/contexts/UserResponsesContext.tsx`
- ❌ `app/contexts/CurrentPodcastContext.tsx`

Update `app/_layout.tsx`:

**Before:**
```tsx
<DiscussionProvider>
  <UserResponsesProvider>
    <CurrentPodcastProvider>
      {/* App */}
    </CurrentPodcastProvider>
  </UserResponsesProvider>
</DiscussionProvider>
```

**After:**
```tsx
{/* Remove all three providers - just use QueryClientProvider */}
```

### Step 9: Update Imports

Find and replace all imports:

```bash
# Find all files importing old contexts
grep -r "from.*DiscussionContext" app/
grep -r "from.*UserResponsesContext" app/
grep -r "from.*CurrentPodcastContext" app/

# Replace with new hooks
# DiscussionContext → useDiscussion hooks
# UserResponsesContext → useSaveDiscussionResponse, useClearDiscussionResponses
# CurrentPodcastContext → useCurrentPodcastStore + usePollProgress
```

---

## Benefits Summary

### Before (Current)

```tsx
// 3 Contexts
<DiscussionProvider>              // 92 lines
  <UserResponsesProvider>         // 129 lines
    <CurrentPodcastProvider>      // 193 lines
      <Component />
    </CurrentPodcastProvider>
  </UserResponsesProvider>
</DiscussionProvider>

// Total: 414 lines of context code
// Duplicated service instances
// Manual subscriptions
// Manual cache management
// Prop drilling
```

### After (Target)

```tsx
// 1 Query hook file + 1 Store
useDiscussion.ts                  // ~200 lines
currentPodcastStore.ts            // ~50 lines (enhanced)

// Total: ~250 lines
// Single service instance
// Automatic subscriptions
// Automatic cache management
// No prop drilling
```

**Savings:**
- 📉 **40% less code** (414 → 250 lines)
- 🚀 **Better performance** (single service instance, smart caching)
- 🐛 **Fewer bugs** (no manual subscription management)
- 🧪 **Easier testing** (mock queries, not contexts)
- 📊 **DevTools** (React Query DevTools shows all queries)

---

## Testing Strategy

### 1. Test Query Hooks

```tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDiscussionQuestions } from '../useDiscussion';

describe('useDiscussionQuestions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('fetches discussion questions', async () => {
    const { result } = renderHook(() => useDiscussionQuestions('episode-123'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3); // Assuming 3 questions
  });
});
```

### 2. Test Mutations

```tsx
describe('useSaveDiscussionResponse', () => {
  it('saves response and invalidates cache', async () => {
    const { result } = renderHook(() => useSaveDiscussionResponse(), {
      wrapper: /* ... */,
    });

    await act(async () => {
      await result.current.mutateAsync({
        questionId: 'q1',
        episodeId: 'ep1',
        agreedValues: [1, 2],
        disagreedValues: [3],
      });
    });

    // Verify cache was invalidated
    expect(queryClient.getQueryState(queryKeys.discussion.progress('ep1', 'user1'))).toMatchObject({
      isInvalidated: true,
    });
  });
});
```

### 3. Integration Testing

Test the full flow:
1. Load unanswered questions
2. Answer a question
3. Verify poll progress updates
4. Verify question moves to "answered"

---

## Migration Checklist

### Phase 1: Setup (Day 1 Morning)
- [ ] Create `app/hooks/queries/useDiscussion.ts`
- [ ] Add discussion query keys to `queryKeys.ts`
- [ ] Enhance `app/stores/currentPodcastStore.ts`
- [ ] Test query hooks in isolation

### Phase 2: Update Components (Day 1 Afternoon - Day 2)
- [ ] Update `CurrentPodcastSection.tsx`
- [ ] Update `home.tsx`
- [ ] Update `DiscussionTopicsStack.tsx`
- [ ] Update `PollReviewAllResults.tsx`
- [ ] Test each component after migration

### Phase 3: Clean Up (Day 2 Afternoon)
- [ ] Delete `DiscussionContext.tsx`
- [ ] Delete `UserResponsesContext.tsx`
- [ ] Delete `CurrentPodcastContext.tsx`
- [ ] Remove providers from `_layout.tsx`
- [ ] Update all imports across codebase

### Phase 4: Testing (Day 3)
- [ ] Test discussion flow end-to-end
- [ ] Test poll progress updates
- [ ] Test clearing responses
- [ ] Test real-time updates
- [ ] Test offline functionality

### Phase 5: Polish (Day 3-4)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test performance
- [ ] Document new patterns

---

## Common Pitfalls & Solutions

### Pitfall 1: Observable Subscription Cleanup

**Problem:** Forgetting to unsubscribe from WatermelonDB observables

**Solution:** Use `useEffect` cleanup in `useUserDiscussionResponses`:

```tsx
useEffect(() => {
  const subscription = discussionRepository
    .observeUserResponsesForEpisode(...)
    .subscribe(...);

  return () => subscription.unsubscribe(); // IMPORTANT!
}, [deps]);
```

### Pitfall 2: Stale Service Instances

**Problem:** Service instances recreating on every render

**Solution:** Use `useRef` to keep stable instances:

```tsx
function useDiscussionServices() {
  const serviceRef = useRef<DiscussionService | null>(null);

  if (database && !serviceRef.current) {
    serviceRef.current = new DiscussionService(database);
  }

  return { discussionService: serviceRef.current };
}
```

### Pitfall 3: Cache Invalidation Timing

**Problem:** Queries not refetching after mutation

**Solution:** Always invalidate related queries in `onSuccess`:

```tsx
useMutation({
  mutationFn: saveResponse,
  onSuccess: (_, { episodeId }) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.discussion.responses(...) });
    queryClient.invalidateQueries({ queryKey: queryKeys.discussion.progress(...) });
    queryClient.invalidateQueries({ queryKey: queryKeys.discussion.unanswered(...) });
  },
});
```

### Pitfall 4: Optimistic Update Rollback

**Problem:** Optimistic updates not rolling back on error

**Solution:** Always return context from `onMutate` and use it in `onError`:

```tsx
useMutation({
  onMutate: async (variables) => {
    const previousData = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, newData);
    return { previousData }; // IMPORTANT!
  },
  onError: (err, variables, context) => {
    if (context?.previousData) {
      queryClient.setQueryData(queryKey, context.previousData); // Rollback
    }
  },
});
```

---

## Next Steps After This Migration

Once this discussion feature is migrated, you'll have:

1. ✅ **A proven pattern** for migrating other contexts
2. ✅ **Better performance** from reduced provider nesting
3. ✅ **Easier debugging** with React Query DevTools
4. ✅ **Foundation for migrating** remaining contexts:
   - Comments
   - Meetups
   - Weekly Selections
   - etc.

**Recommended next migration:** `CommentsContext` → Similar real-time patterns

---

## Questions to Answer Before Starting

1. **Do you have React Query DevTools installed?**
   - If not: `npm install @tanstack/react-query-devtools`

2. **Are there any other files using these contexts?**
   - Run: `grep -r "useDiscussion\|useUserResponses\|useCurrentPodcast" app/`

3. **Do you want to migrate in a feature branch?**
   - Recommended: `git checkout -b migrate/discussion-feature`

4. **Should we keep the old contexts temporarily?**
   - Option: Add `_deprecated` suffix while testing

---

**Ready to start?** Let's begin with Phase 1 - creating the query hooks!
