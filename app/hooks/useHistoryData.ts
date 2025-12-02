import { useEffect, useState, useCallback } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { WeeklySelectionRepository } from '../data/repositories/weekly-selection.repository';
import { ProgressRepository } from '../data/repositories/progress.repository';
import { MembersRepository } from '../data/repositories/members.repository';

export interface MemberAvatar {
  id: string;
  avatar?: string;
}

export interface HistoryEpisode {
  id: string;
  podcastTitle: string;
  episodeTitle: string;
  source: string;
  artwork: string;
  peopleInClub: number;
  members: MemberAvatar[];
  progress: number;
  audioUrl: string;
  description: string;
  chosenAt: Date;
  monthYear: string;
}

export interface GroupedHistory {
  [monthYear: string]: HistoryEpisode[];
}

interface UseHistoryDataOptions {
  limit?: number;
}

interface UseHistoryDataReturn {
  historyData: GroupedHistory;
  flatHistory: HistoryEpisode[];
  loading: boolean;
  refetch: () => void;
}

export function useHistoryData(options?: UseHistoryDataOptions): UseHistoryDataReturn {
  const { database } = useDatabase();
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<GroupedHistory>({});
  const [flatHistory, setFlatHistory] = useState<HistoryEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!database || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const weeklySelectionRepo = new WeeklySelectionRepository(database);
      const progressRepo = new ProgressRepository(database);
      const membersRepo = new MembersRepository(database);

      // Fetch all user weekly choices
      const choices = await weeklySelectionRepo.getAllUserWeeklyChoices(user.id);

      // Process each choice to get progress and member count
      const episodesWithProgress = await Promise.all(
        choices.map(async (choice) => {
          // Get progress for this episode
          const progress = await progressRepo.getProgress(user.id, choice.episodeId);
          const progressPercentage = progress && progress.totalDuration > 0
            ? (progress.currentPosition / progress.totalDuration) * 100
            : 0;

          // Get member count for this episode
          const memberCount = await weeklySelectionRepo.getEpisodeMemberCount(choice.episodeId);

          // Get members for avatar stack
          const episodeMembers = await membersRepo.getEpisodeMembers(choice.episodeId);
          const memberAvatars: MemberAvatar[] = episodeMembers.map(m => ({
            id: m.userId,
            avatar: m.avatarUrl,
          }));

          // Format month/year for grouping
          const date = new Date(choice.chosenAt);
          const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

          return {
            id: choice.episodeId,
            podcastTitle: choice.episodeTitle || 'Unknown Episode',
            episodeTitle: choice.podcastTitle || 'Unknown Podcast',
            source: choice.podcastTitle || 'Unknown Podcast',
            artwork: choice.artworkUrl || 'https://via.placeholder.com/150',
            peopleInClub: memberCount,
            members: memberAvatars,
            progress: Math.round(progressPercentage),
            audioUrl: choice.audioUrl || '',
            description: choice.description || '',
            chosenAt: new Date(choice.chosenAt),
            monthYear,
          };
        })
      );

      // Filter out episodes with unknown/missing data
      const validEpisodes = episodesWithProgress.filter(
        episode => episode.podcastTitle !== 'Unknown Episode' &&
                   episode.episodeTitle !== 'Unknown Podcast'
      );

      // Sort by chosenAt descending (most recent first)
      const sortedEpisodes = validEpisodes.sort(
        (a, b) => b.chosenAt.getTime() - a.chosenAt.getTime()
      );

      // Create flat history (optionally limited)
      const limited = options?.limit
        ? sortedEpisodes.slice(0, options.limit)
        : sortedEpisodes;
      setFlatHistory(limited);

      // Group by month/year
      const grouped = sortedEpisodes.reduce<GroupedHistory>((acc, episode) => {
        if (!acc[episode.monthYear]) {
          acc[episode.monthYear] = [];
        }
        acc[episode.monthYear].push(episode);
        return acc;
      }, {});

      setHistoryData(grouped);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }, [database, user, options?.limit]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    historyData,
    flatHistory,
    loading,
    refetch: loadHistory,
  };
}
