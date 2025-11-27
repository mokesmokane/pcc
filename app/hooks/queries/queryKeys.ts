/**
 * Query keys for React Query
 * Organized by feature domain
 */

export const queryKeys = {
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

  // Profile
  profile: {
    all: ['profile'] as const,
    current: () => [...queryKeys.profile.all, 'current'] as const,
    user: (userId: string) => [...queryKeys.profile.all, userId] as const,
  },

  // Friends
  friends: {
    all: ['friends'] as const,
    list: () => [...queryKeys.friends.all, 'list'] as const,
  },

  // Podcast Metadata (Progress, History, Stats)
  podcastMetadata: {
    all: ['podcastMetadata'] as const,
    progress: (episodeId: string, userId: string) =>
      [...queryKeys.podcastMetadata.all, 'progress', episodeId, userId] as const,
    multipleProgress: (episodeIds: string[], userId: string) =>
      [...queryKeys.podcastMetadata.all, 'multipleProgress', episodeIds.join(','), userId] as const,
    history: (userId: string, limit?: number) =>
      [...queryKeys.podcastMetadata.all, 'history', userId, limit ?? 10] as const,
    stats: (userId: string) =>
      [...queryKeys.podcastMetadata.all, 'stats', userId] as const,
  },

  // Conversation Starters
  conversationStarters: {
    all: ['conversationStarters'] as const,
    list: (episodeId: string) =>
      [...queryKeys.conversationStarters.all, 'list', episodeId] as const,
    comments: (starterId: string) =>
      [...queryKeys.conversationStarters.all, 'comments', starterId] as const,
  },
};
