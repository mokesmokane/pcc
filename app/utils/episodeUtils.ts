/**
 * Utility functions for handling episodes
 */

/**
 * Check if an episode ID is a valid UUID (Podcast Club episode)
 * vs a traditional podcast episode ID (e.g., "substack:post:123")
 */
export function isPodcastClubEpisode(episodeId: string | null | undefined): boolean {
  if (!episodeId) return false;

  // UUID regex pattern (RFC 4122)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return uuidRegex.test(episodeId);
}

/**
 * Check if Podcast Club features should be enabled for this episode
 * (chapters, comments, members, transcript, discussion, meetups)
 */
export function shouldEnablePodcastClubFeatures(episodeId: string | null | undefined): boolean {
  return isPodcastClubEpisode(episodeId);
}
