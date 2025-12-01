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
  durationSeconds: number;
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
  selectEpisode: (episodeId: string, podcast?: WeeklyPodcast) => Promise<boolean>;
  refreshSelections: () => Promise<void>;
  getEpisodeMemberCount: (episodeId: string) => Promise<number>;
  clearUserChoice: () => void;
  addToSelections: (podcast: WeeklyPodcast) => void;
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

  // Helper functions (defined before transformSelections which uses them)
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

  const decodeHtmlEntities = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…');
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Convert WeeklySelection model to WeeklyPodcast format
  const transformSelections = async (dbSelections: WeeklySelection[]): Promise<WeeklyPodcast[]> => {
    const transformed = await Promise.all(dbSelections.map(async selection => {
      // Fetch episode details if available
      const details = await episodeDetailsRepository.getEpisodeDetails(selection.episodeId);

      // All data is now directly on the selection model (decode HTML entities)
      return {
        id: selection.episodeId,
        category: selection.category || 'podcast',
        categoryLabel: getCategoryLabel(selection.category || 'podcast'),
        title: decodeHtmlEntities(selection.podcastTitle || 'Unknown Podcast'),
        source: decodeHtmlEntities(selection.episodeTitle || 'Unknown Episode'),
        clubMembers: 0, // Will be updated with getEpisodeMemberCount
        progress: 0,
        duration: formatDuration(selection.duration || 0),
        durationSeconds: selection.duration || 0,
        episode: decodeHtmlEntities(selection.episodeTitle || 'Unknown Episode'),
        image: selection.artworkUrl || undefined,
        audioUrl: selection.audioUrl,
        description: decodeHtmlEntities(selection.episodeDescription || ''),
        about: decodeHtmlEntities(details?.about || ''),
        whyWeLoveIt: decodeHtmlEntities(details?.whyWeLoveIt || ''),
      };
    }));

    return transformed;
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

  const selectEpisode = async (episodeId: string, podcast?: WeeklyPodcast): Promise<boolean> => {
    if (!user?.id) {
      console.error('User not authenticated');
      return false;
    }

    try {
      const success = await weeklySelectionRepository.saveUserWeeklyChoice(user.id, episodeId);
      if (success) {
        // Use provided podcast (for wildcards) or get from selections
        const selectedPodcast = podcast || selections.get(episodeId) || null;
        setUserChoice(selectedPodcast);

        // Add to userChoices if not already present
        if (selectedPodcast) {
          setUserChoices(prev => {
            if (prev.some(p => p.id === episodeId)) return prev;
            return [selectedPodcast, ...prev];
          });
        }

        // Update member count for this episode
        const updatedSelections = await Promise.all(
          Array.from(selections.entries()).map(async ([, podcast]) => {
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

  // Add a podcast to selections (used for wildcard episodes)
  const addToSelections = (podcast: WeeklyPodcast) => {
    setSelections(prev => {
      const newMap = new Map(prev);
      newMap.set(podcast.id, podcast);
      return newMap;
    });
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
      addToSelections,
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