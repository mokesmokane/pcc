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

  // Add other feature query keys here as needed
  // Example:
  // comments: {
  //   all: ['comments'] as const,
  //   byEpisode: (episodeId: string) => [...queryKeys.comments.all, 'episode', episodeId] as const,
  // },
};
