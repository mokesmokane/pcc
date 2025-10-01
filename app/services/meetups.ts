import { Database } from '@nozbe/watermelondb';
import { MeetupRepository } from '../data/repositories/meetup.repository';
import { supabase } from '../lib/supabase';

export interface Meetup {
  id: string;
  title: string;
  description?: string;
  location: string;
  venue: string;
  address: string;
  latitude?: number;
  longitude?: number;
  meetup_date: string;
  meetup_time: string;
  spaces: number;
  organizer_id?: string;
  status: 'active' | 'cancelled' | 'completed';
  created_at: string;
  attendee_count: number;
  spots_left: number;
  attendees?: {
    user_id: string;
    avatar_url?: string;
    username?: string;
    joined_at?: string;
  }[];
  related_episodes?: {
    episode_id: string;
    episode_title: string;
    podcast_title: string;
    artwork_url?: string;
  }[];
}

export class MeetupsService {
  private repository: MeetupRepository;

  constructor(database: Database) {
    this.repository = new MeetupRepository(database);
  }

  /**
   * Sync meetups from Supabase for an episode
   */
  async syncMeetupsForEpisode(episodeId: string): Promise<void> {
    await this.repository.syncFromSupabase(episodeId);
  }

  /**
   * Sync all upcoming meetups from Supabase
   */
  async syncAllUpcomingMeetups(): Promise<void> {
    await this.repository.syncAllUpcomingFromSupabase();
  }

  /**
   * Get meetups for an episode (from local database)
   */
  async getMeetupsForEpisode(episodeId: string): Promise<any[]> {
    const meetups = await this.repository.findByEpisode(episodeId);

    // Transform to include attendee details
    const meetupsWithDetails = await Promise.all(
      meetups.map(async (meetup) => {
        const attendees = await this.repository.getAttendeesForMeetup(meetup.id);
        const attendeeCount = attendees.filter(a => a.status === 'confirmed').length;

        // Get related episodes with full details
        const relatedEpisodes = await this.repository.getRelatedEpisodesForMeetup(meetup.id);

        return {
          id: meetup.id,
          title: meetup.title,
          description: meetup.description,
          location: meetup.location,
          venue: meetup.venue,
          address: meetup.address,
          latitude: meetup.latitude,
          longitude: meetup.longitude,
          meetup_date: meetup.meetupDate,
          meetup_time: meetup.meetupTime,
          spaces: meetup.spaces,
          organizer_id: meetup.organizerId,
          status: meetup.status,
          created_at: meetup.createdAt.toISOString(),
          attendee_count: attendeeCount,
          spots_left: Math.max(0, meetup.spaces - attendeeCount),
          attendees: attendees.map(a => ({
            user_id: a.userId,
            avatar_url: a.avatarUrl,
            username: a.username,
            joined_at: new Date(a.joinedAt).toISOString()
          })),
          related_episodes: relatedEpisodes
        };
      })
    );

    return meetupsWithDetails;
  }

  /**
   * Get all upcoming meetups (from local database)
   */
  async getAllUpcomingMeetups(): Promise<any[]> {
    const meetups = await this.repository.findAllUpcoming();

    // Transform to include attendee details
    const meetupsWithDetails = await Promise.all(
      meetups.map(async (meetup) => {
        const attendees = await this.repository.getAttendeesForMeetup(meetup.id);
        const attendeeCount = attendees.filter(a => a.status === 'confirmed').length;

        // Get related episodes with full details
        const relatedEpisodes = await this.repository.getRelatedEpisodesForMeetup(meetup.id);

        return {
          id: meetup.id,
          title: meetup.title,
          description: meetup.description,
          location: meetup.location,
          venue: meetup.venue,
          address: meetup.address,
          latitude: meetup.latitude,
          longitude: meetup.longitude,
          meetup_date: meetup.meetupDate,
          meetup_time: meetup.meetupTime,
          spaces: meetup.spaces,
          organizer_id: meetup.organizerId,
          status: meetup.status,
          created_at: meetup.createdAt.toISOString(),
          attendee_count: attendeeCount,
          spots_left: Math.max(0, meetup.spaces - attendeeCount),
          attendees: attendees.map(a => ({
            user_id: a.userId,
            avatar_url: a.avatarUrl,
            username: a.username,
            joined_at: new Date(a.joinedAt).toISOString()
          })),
          related_episodes: relatedEpisodes
        };
      })
    );

    return meetupsWithDetails;
  }

  /**
   * Observe meetups for an episode
   */
  observeMeetupsForEpisode(episodeId: string) {
    return this.repository.observeByEpisode(episodeId);
  }

  /**
   * Join a meetup
   */
  async joinMeetup(meetupId: string): Promise<'confirmed' | 'waitlist' | 'already_joined'> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be logged in to join meetup');

    return await this.repository.joinMeetup(meetupId, user.id);
  }

  /**
   * Leave a meetup
   */
  async leaveMeetup(meetupId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be logged in to leave meetup');

    return await this.repository.leaveMeetup(meetupId, user.id);
  }

  /**
   * Get user status for a meetup
   */
  async getUserMeetupStatus(meetupId: string): Promise<'confirmed' | 'waitlist' | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return await this.repository.getUserStatusForMeetup(meetupId, user.id);
  }

  /**
   * Create a new meetup
   */
  async createMeetup(meetupData: {
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
    episode_ids?: string[]; // Array of episode IDs to associate
  }): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be logged in to create meetup');

    const { episode_ids, ...meetupInfo } = meetupData;

    const meetup = await this.repository.createMeetup({
      ...meetupInfo,
      organizer_id: user.id,
      spaces: meetupData.spaces || 8
    }, episode_ids || []);

    // Auto-join the organizer
    await this.joinMeetup(meetup.id);

    // Return the created meetup with full details
    if (episode_ids && episode_ids.length > 0) {
      return await this.getMeetupsForEpisode(episode_ids[0])
        .then(meetups => meetups.find(m => m.id === meetup.id));
    }

    return meetup;
  }

  /**
   * Associate an episode with an existing meetup
   */
  async associateEpisodeWithMeetup(episodeId: string, meetupId: string, relevanceNote?: string): Promise<void> {
    await this.repository.associateEpisodeWithMeetup(episodeId, meetupId, relevanceNote);
  }

  /**
   * Cancel a meetup
   */
  async cancelMeetup(meetupId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be logged in to cancel meetup');

    await this.repository.cancelMeetup(meetupId, user.id);
  }
}