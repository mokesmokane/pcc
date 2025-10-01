import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { MeetupsService, Meetup } from '../services/meetups';
import { useDatabase } from './DatabaseContext';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';

interface MeetupsContextType {
  meetups: Meetup[];
  loading: boolean;
  error: string | null;
  userStatuses: Map<string, 'confirmed' | 'waitlist' | null>;
  loadMeetups: (episodeId: string) => Promise<void>;
  loadAllMeetups: () => Promise<void>;
  joinMeetup: (meetupId: string) => Promise<boolean>;
  leaveMeetup: (meetupId: string) => Promise<boolean>;
  createMeetup: (meetupData: {
    title: string;
    description?: string;
    location: string;
    venue: string;
    address: string;
    meetup_date: string;
    meetup_time: string;
    spaces?: number;
    latitude?: number;
    longitude?: number;
    episode_ids?: string[];
  }) => Promise<Meetup | null>;
  cancelMeetup: (meetupId: string) => Promise<boolean>;
}

const MeetupsContext = createContext<MeetupsContextType | undefined>(undefined);

export function MeetupsProvider({ children }: { children: ReactNode }) {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<Map<string, 'confirmed' | 'waitlist' | null>>(new Map());

  const { user } = useAuth();
  const { database } = useDatabase();
  const [meetupsService, setMeetupsService] = useState<MeetupsService | null>(null);

  // Initialize service
  useEffect(() => {
    if (database) {
      setMeetupsService(new MeetupsService(database));
    }
  }, [database]);

  // Load meetups for an episode
  const loadMeetups = async (episodeId: string) => {
    if (!meetupsService || !episodeId) {
      console.log('MeetupsContext: Cannot load - service or episodeId missing', { meetupsService: !!meetupsService, episodeId });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCurrentEpisodeId(episodeId);

      console.log('MeetupsContext: Syncing meetups for episode:', episodeId);
      // Sync from Supabase first
      await meetupsService.syncMeetupsForEpisode(episodeId);

      // Get meetups from local database
      const meetupsData = await meetupsService.getMeetupsForEpisode(episodeId);
      console.log('MeetupsContext: Loaded meetups:', meetupsData.length, meetupsData);
      setMeetups(meetupsData);

      // Check user status for each meetup
      if (user) {
        const statuses = new Map();
        for (const meetup of meetupsData) {
          const status = await meetupsService.getUserMeetupStatus(meetup.id);
          statuses.set(meetup.id, status);
        }
        setUserStatuses(statuses);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetups');
      console.error('Error loading meetups:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load all upcoming meetups (not filtered by episode)
  const loadAllMeetups = async () => {
    if (!meetupsService) {
      console.log('MeetupsContext: Cannot load all - service missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCurrentEpisodeId(null);

      console.log('MeetupsContext: Syncing all upcoming meetups');
      // Sync from Supabase first
      await meetupsService.syncAllUpcomingMeetups();

      // Get all upcoming meetups from local database
      const meetupsData = await meetupsService.getAllUpcomingMeetups();
      console.log('MeetupsContext: Loaded all meetups:', meetupsData.length, meetupsData);
      setMeetups(meetupsData);

      // Check user status for each meetup
      if (user) {
        const statuses = new Map();
        for (const meetup of meetupsData) {
          const status = await meetupsService.getUserMeetupStatus(meetup.id);
          statuses.set(meetup.id, status);
        }
        setUserStatuses(statuses);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetups');
      console.error('Error loading all meetups:', err);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to meetup changes
  useEffect(() => {
    if (!meetupsService || !currentEpisodeId) return;

    const subscription = meetupsService.observeMeetupsForEpisode(currentEpisodeId).subscribe(
      async (localMeetups) => {
        // Transform local meetups to match our interface
        const meetupsData = await meetupsService.getMeetupsForEpisode(currentEpisodeId);
        setMeetups(meetupsData);

        // Update user statuses
        if (user) {
          const statuses = new Map();
          for (const meetup of meetupsData) {
            const status = await meetupsService.getUserMeetupStatus(meetup.id);
            statuses.set(meetup.id, status);
          }
          setUserStatuses(statuses);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [meetupsService, currentEpisodeId, user]);

  // Join a meetup
  const joinMeetup = async (meetupId: string): Promise<boolean> => {
    if (!meetupsService) {
      Alert.alert('Error', 'Service not initialized');
      return false;
    }

    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to join meetups');
      return false;
    }

    try {
      const status = await meetupsService.joinMeetup(meetupId);

      if (status === 'already_joined') {
        Alert.alert('Already Joined', 'You have already joined this meetup');
        return false;
      }

      // Update local state
      setUserStatuses(prev => new Map(prev).set(meetupId, status));

      // Update meetup attendee count optimistically
      setMeetups(prev => prev.map(m => {
        if (m.id === meetupId) {
          return {
            ...m,
            attendee_count: m.attendee_count + 1,
            spots_left: Math.max(0, m.spots_left - 1)
          };
        }
        return m;
      }));

      if (status === 'waitlist') {
        Alert.alert('Added to Waitlist', 'This meetup is full. You have been added to the waitlist.');
      } else {
        Alert.alert('Joined!', 'You have successfully joined this meetup');
      }

      // Refresh meetups
      if (currentEpisodeId) {
        loadMeetups(currentEpisodeId);
      }

      return true;
    } catch (err) {
      Alert.alert('Error', 'Failed to join meetup. Please try again.');
      console.error('Error joining meetup:', err);
      return false;
    }
  };

  // Leave a meetup
  const leaveMeetup = async (meetupId: string): Promise<boolean> => {
    if (!meetupsService) {
      Alert.alert('Error', 'Service not initialized');
      return false;
    }

    try {
      const success = await meetupsService.leaveMeetup(meetupId);

      if (!success) {
        Alert.alert('Error', 'Failed to leave meetup');
        return false;
      }

      // Update local state
      setUserStatuses(prev => {
        const newMap = new Map(prev);
        newMap.delete(meetupId);
        return newMap;
      });

      // Update meetup attendee count optimistically
      const wasConfirmed = userStatuses.get(meetupId) === 'confirmed';
      setMeetups(prev => prev.map(m => {
        if (m.id === meetupId) {
          return {
            ...m,
            attendee_count: wasConfirmed ? Math.max(0, m.attendee_count - 1) : m.attendee_count,
            spots_left: wasConfirmed ? m.spots_left + 1 : m.spots_left
          };
        }
        return m;
      }));

      Alert.alert('Left Meetup', 'You have successfully left this meetup');

      // Refresh meetups
      if (currentEpisodeId) {
        loadMeetups(currentEpisodeId);
      }

      return true;
    } catch (err) {
      Alert.alert('Error', 'Failed to leave meetup. Please try again.');
      console.error('Error leaving meetup:', err);
      return false;
    }
  };

  // Create a meetup
  const createMeetup = async (meetupData: {
    title: string;
    description?: string;
    location: string;
    venue: string;
    address: string;
    meetup_date: string;
    meetup_time: string;
    spaces?: number;
    latitude?: number;
    longitude?: number;
    episode_ids?: string[];
  }): Promise<Meetup | null> => {
    if (!meetupsService) {
      Alert.alert('Error', 'Cannot create meetup at this time');
      return null;
    }

    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to create meetups');
      return null;
    }

    try {
      // If no episode_ids provided but we have a current episode, use it
      const episodeIds = meetupData.episode_ids || (currentEpisodeId ? [currentEpisodeId] : []);

      const newMeetup = await meetupsService.createMeetup({
        ...meetupData,
        episode_ids: episodeIds
      });

      // Add to local state
      setMeetups(prev => [...prev, newMeetup]);
      setUserStatuses(prev => new Map(prev).set(newMeetup.id, 'confirmed'));

      Alert.alert('Success', 'Meetup created successfully!');

      // Refresh meetups for the current episode if applicable
      if (currentEpisodeId && episodeIds.includes(currentEpisodeId)) {
        loadMeetups(currentEpisodeId);
      }

      return newMeetup;
    } catch (err) {
      Alert.alert('Error', 'Failed to create meetup. Please try again.');
      console.error('Error creating meetup:', err);
      return null;
    }
  };

  // Cancel a meetup
  const cancelMeetup = async (meetupId: string): Promise<boolean> => {
    if (!meetupsService) {
      Alert.alert('Error', 'Service not initialized');
      return false;
    }

    try {
      await meetupsService.cancelMeetup(meetupId);

      // Remove from local state
      setMeetups(prev => prev.filter(m => m.id !== meetupId));
      setUserStatuses(prev => {
        const newMap = new Map(prev);
        newMap.delete(meetupId);
        return newMap;
      });

      Alert.alert('Cancelled', 'Meetup has been cancelled');

      // Refresh meetups
      if (currentEpisodeId) {
        loadMeetups(currentEpisodeId);
      }

      return true;
    } catch (err) {
      Alert.alert('Error', 'Failed to cancel meetup. You may not be the organizer.');
      console.error('Error cancelling meetup:', err);
      return false;
    }
  };

  return (
    <MeetupsContext.Provider
      value={{
        meetups,
        loading,
        error,
        userStatuses,
        loadMeetups,
        loadAllMeetups,
        joinMeetup,
        leaveMeetup,
        createMeetup,
        cancelMeetup
      }}
    >
      {children}
    </MeetupsContext.Provider>
  );
}

export function useMeetups() {
  const context = useContext(MeetupsContext);
  if (!context) {
    throw new Error('useMeetups must be used within a MeetupsProvider');
  }
  return context;
}