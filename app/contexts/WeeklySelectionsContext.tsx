import type { ReactNode} from 'react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useDatabase } from './DatabaseContext';
import { useAuth } from './AuthContext';
import type WeeklySelection from '../data/models/weekly-selection.model';

export interface WeeklyPodcast {
  id: string;
  category: string;
  categoryLabel?: string;
  title: string;
  source: string;
  clubMembers: number;
  progress: number;
  duration: string;
  episode: string;
  image?: string;
  audioUrl?: string;
  description?: string;
  about?: string;
  whyWeLoveIt?: string;
}

interface WeeklySelectionsContextType {
  selections: Map<string, WeeklyPodcast>;
  loading: boolean;
  error: string | null;
  userChoice: WeeklyPodcast | null;
  userChoices: WeeklyPodcast[];
  userChoiceLoaded: boolean;
  selectEpisode: (episodeId: string) => Promise<boolean>;
  refreshSelections: () => Promise<void>;
  getEpisodeMemberCount: (episodeId: string) => Promise<number>;
  clearUserChoice: () => void;
}

const WeeklySelectionsContext = createContext<WeeklySelectionsContextType | undefined>(undefined);

interface WeeklySelectionsProviderProps {
  children: ReactNode;
}

export const WeeklySelectionsProvider: React.FC<WeeklySelectionsProviderProps> = ({ children }) => {
  const { weeklySelectionRepository, episodeDetailsRepository } = useDatabase();
  const { user } = useAuth();

  const [selections, setSelections] = useState<Map<string, WeeklyPodcast>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userChoice, setUserChoice] = useState<WeeklyPodcast | null>(null);
  const [userChoices, setUserChoices] = useState<WeeklyPodcast[]>([]);
  const [userChoiceLoaded, setUserChoiceLoaded] = useState(false);

  // Convert WeeklySelection model to WeeklyPodcast format
  const transformSelections = async (dbSelections: WeeklySelection[]): Promise<WeeklyPodcast[]> => {
    const transformed = await Promise.all(dbSelections.map(async selection => {
      // Fetch episode details if available
      const details = await episodeDetailsRepository.getEpisodeDetails(selection.episodeId);

      // All data is now directly on the selection model
      return {
        id: selection.episodeId,
        category: selection.category || 'podcast',
        categoryLabel: getCategoryLabel(selection.category || 'podcast'),
        title: selection.podcastTitle || 'Unknown Podcast',
        source: selection.episodeTitle || 'Unknown Episode',
        clubMembers: 0, // Will be updated with getEpisodeMemberCount
        progress: 0,
        duration: formatDuration(selection.duration || 0),
        episode: selection.episodeTitle || 'Unknown Episode',
        image: selection.artworkUrl || undefined,
        audioUrl: selection.audioUrl,
        description: selection.episodeDescription,
        about: details?.about,
        whyWeLoveIt: details?.whyWeLoveIt,
      };
    }));

    return transformed;
  };

  const getCategoryLabel = (category: string): string => {
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
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const loadSelections = async () => {
    setLoading(true);
    setError(null);

    try {
      // Sync with remote first
      await weeklySelectionRepository.syncWithRemote();
      await episodeDetailsRepository.syncWithRemote();

      // Load current week's selections
      const dbSelections = await weeklySelectionRepository.getCurrentWeekSelections();
      const transformed = await transformSelections(dbSelections);

      // Update member counts for each episode
      const withMemberCounts = await Promise.all(
        transformed.map(async (podcast) => {
          const count = await weeklySelectionRepository.getEpisodeMemberCount(podcast.id);
          return { ...podcast, clubMembers: count };
        })
      );
      const selectionMap = new Map<string, WeeklyPodcast>();
      withMemberCounts.forEach(podcast => {
        selectionMap.set(podcast.id, podcast);
      });
      setSelections(selectionMap);

      // Load user's choices if logged in
      if (user?.id) {
        const choiceIds = await weeklySelectionRepository.getUserWeeklyChoices(user.id);
        if (choiceIds.length === 0) {
          setUserChoice(null);
          setUserChoices([]);
        } else {
          // Map choice IDs to podcasts
          const choices = choiceIds
            .map(id => selectionMap.get(id))
            .filter((p): p is WeeklyPodcast => p !== undefined);

          setUserChoices(choices);
          // Set the most recent choice as the primary userChoice
          setUserChoice(choices[0] || null);
        }
        setUserChoiceLoaded(true);
      } else {
        setUserChoiceLoaded(true);
      }
    } catch (err) {
      console.error('Error loading weekly selections:', err);
      setError('Failed to load weekly selections');
    } finally {
      setLoading(false);
    }
  };

  const selectEpisode = async (episodeId: string): Promise<boolean> => {
    if (!user?.id) {
      console.error('User not authenticated');
      return false;
    }

    try {
      const success = await weeklySelectionRepository.saveUserWeeklyChoice(user.id, episodeId);
      if (success) {
        setUserChoice(selections.get(episodeId)||null);

        // Update member count for this episode
        const updatedSelections = await Promise.all(
          Array.from(selections.entries()).map(async ([id, podcast]) => {
            if (podcast.id === episodeId) {
              const count = await weeklySelectionRepository.getEpisodeMemberCount(podcast.id);
              return { ...podcast, clubMembers: count };
            }
            return podcast;
          })
        );
        setSelections(new Map(updatedSelections.map(podcast => [podcast.id, podcast])));
      }
      return success;
    } catch (err) {
      console.error('Error saving episode selection:', err);
      return false;
    }
  };

  const getEpisodeMemberCount = async (episodeId: string): Promise<number> => {
    try {
      return await weeklySelectionRepository.getEpisodeMemberCount(episodeId);
    } catch (err) {
      console.error('Error getting member count:', err);
      return 0;
    }
  };

  const refreshSelections = async () => {
    await loadSelections();
  };

  const clearUserChoice = () => {
    setUserChoice(null);
    // Note: This only clears the local state, not the database
    // If you want to also clear from database, you'd need to add a method in the repository
  };

  // Load selections on mount and when user changes
  useEffect(() => {
    loadSelections();
  }, [user?.id]);

  // Subscribe to WatermelonDB changes for weekly selections (reactive)
  useEffect(() => {
    console.log('📅 Setting up WatermelonDB observable for weekly selections...');

    const subscription = weeklySelectionRepository.observeCurrentWeekSelections()
      .subscribe(async (dbSelections) => {
        console.log('📅 WatermelonDB OBSERVABLE FIRED - Weekly selections:', dbSelections.length);

        // Transform and update selections
        const transformed = await transformSelections(dbSelections);
        const withMemberCounts = await Promise.all(
          transformed.map(async (podcast) => {
            const count = await weeklySelectionRepository.getEpisodeMemberCount(podcast.id);
            return { ...podcast, clubMembers: count };
          })
        );

        const selectionMap = new Map<string, WeeklyPodcast>();
        withMemberCounts.forEach(podcast => {
          selectionMap.set(podcast.id, podcast);
        });
        setSelections(selectionMap);

        // Update user choices if they exist
        if (user?.id) {
          const choiceIds = await weeklySelectionRepository.getUserWeeklyChoices(user.id);
          if (choiceIds.length > 0) {
            const choices = choiceIds
              .map(id => selectionMap.get(id))
              .filter((p): p is WeeklyPodcast => p !== undefined);
            setUserChoices(choices);
            setUserChoice(choices[0] || null);
          }
        }
      });

    console.log('📅 WatermelonDB observable subscribed for weekly selections');

    return () => {
      subscription.unsubscribe();
      console.log('📅 Unsubscribed from weekly selections observable');
    };
  }, [weeklySelectionRepository, episodeDetailsRepository, user?.id]);

  const value = useMemo(
    () => ({
      selections,
      loading,
      error,
      userChoice,
      userChoices,
      userChoiceLoaded,
      selectEpisode,
      refreshSelections,
      getEpisodeMemberCount,
      clearUserChoice,
    }),
    [selections, loading, error, userChoice, userChoices, userChoiceLoaded]
  );

  return (
    <WeeklySelectionsContext.Provider value={value}>
      {children}
    </WeeklySelectionsContext.Provider>
  );
};

export const useWeeklySelections = (): WeeklySelectionsContextType => {
  const context = useContext(WeeklySelectionsContext);
  if (!context) {
    throw new Error('useWeeklySelections must be used within a WeeklySelectionsProvider');
  }
  return context;
};