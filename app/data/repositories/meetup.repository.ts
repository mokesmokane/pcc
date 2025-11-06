import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';
import { BaseRepository } from './base.repository';
import type Meetup from '../models/meetup.model';
import type MeetupAttendee from '../models/meetup-attendee.model';
import type EpisodeMeetup from '../models/episode-meetup.model';
import { supabase } from '../../lib/supabase';

export interface MeetupWithDetails extends Meetup {
  attendee_count: number;
  spots_left: number;
  attendees: {
    user_id: string;
    avatar_url?: string;
    username?: string;
    joined_at?: string;
  }[];
}

export class MeetupRepository extends BaseRepository<Meetup> {
  private attendeeCollection: any;
  private episodeMeetupCollection: any;
  private lastSyncTime: Map<string, number> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(database: Database) {
    super(database, 'meetups');
    this.attendeeCollection = database.get('meetup_attendees');
    this.episodeMeetupCollection = database.get('episode_meetups');
  }

  async upsertFromRemote(remoteData: any): Promise<Meetup> {
    const existing = await this.findById(remoteData.id);

    const flatData = {
      title: remoteData.title,
      description: remoteData.description,
      location: remoteData.location,
      venue: remoteData.venue,
      address: remoteData.address,
      latitude: remoteData.latitude,
      longitude: remoteData.longitude,
      meetup_date: remoteData.meetup_date,
      meetup_time: remoteData.meetup_time,
      spaces: remoteData.spaces,
      organizer_id: remoteData.organizer_id,
      status: remoteData.status,
      synced_at: Date.now(),
      needs_sync: false,
    };

    if (existing) {
      return await this.update(remoteData.id, flatData as any);
    } else {
      return await this.create({
        id: remoteData.id,
        ...flatData,
        created_at: new Date(remoteData.created_at).getTime(),
        updated_at: new Date(remoteData.updated_at).getTime(),
      } as any);
    }
  }

  async markForSync(id: string): Promise<void> {
    await this.update(id, { needsSync: true } as any);
  }

  observeByEpisode(episodeId: string): Observable<Meetup[]> {
    // First get meetup IDs associated with this episode
    return new Observable(observer => {
      this.episodeMeetupCollection
        .query(Q.where('episode_id', episodeId))
        .observe()
        .subscribe(async (episodeMeetups: EpisodeMeetup[]) => {
          const meetupIds = episodeMeetups.map(em => em.meetupId);
          if (meetupIds.length === 0) {
            observer.next([]);
            return;
          }

          const meetups = await this.collection
            .query(
              Q.where('id', Q.oneOf(meetupIds)),
              Q.where('status', 'active')
            )
            .fetch();
          observer.next(meetups);
        });
    });
  }

  async findByEpisode(episodeId: string): Promise<Meetup[]> {
    // Get meetup IDs associated with this episode
    const episodeMeetups = await this.episodeMeetupCollection
      .query(Q.where('episode_id', episodeId))
      .fetch();

    if (episodeMeetups.length === 0) return [];

    const meetupIds = episodeMeetups.map((em: EpisodeMeetup) => em.meetupId);

    return await this.collection
      .query(
        Q.where('id', Q.oneOf(meetupIds)),
        Q.where('status', 'active')
      )
      .fetch();
  }

  async findAllUpcoming(): Promise<Meetup[]> {
    // Get all active meetups with a future date
    const today = new Date().toISOString().split('T')[0];

    return await this.collection
      .query(
        Q.where('status', 'active'),
        Q.where('meetup_date', Q.gte(today)),
        Q.sortBy('meetup_date', Q.asc)
      )
      .fetch();
  }

  async syncFromSupabase(episodeId: string, force = false): Promise<void> {
    try {
      // Check cache age
      const lastSync = this.lastSyncTime.get(episodeId) || 0;
      const cacheAge = Date.now() - lastSync;

      if (!force && cacheAge < this.CACHE_TTL) {
        console.log(`✅ Meetup cache valid for episode ${episodeId}, skipping sync (age: ${Math.floor(cacheAge / 1000)}s)`);
        return;
      }

      console.log(`📥 Meetup cache expired or forced for episode ${episodeId}, syncing...`);

      // Fetch meetups for this episode using the function
      const { data: meetups, error } = await supabase
        .rpc('get_meetups_for_episode', { p_episode_id: episodeId });

      if (error) throw error;

      // Upsert each meetup
      if (meetups) {
        for (const meetup of meetups) {
          await this.upsertFromRemote(meetup);

          // Sync attendees for this meetup
          await this.syncAttendees(meetup.id, meetup.attendees);

          // Sync episode-meetup relationships
          await this.syncEpisodeMeetups(meetup.id, meetup.related_episodes || []);
        }
      }

      // Update cache timestamp
      this.lastSyncTime.set(episodeId, Date.now());
    } catch (error) {
      console.error('Error syncing meetups from Supabase:', error);
      throw error;
    }
  }

  async syncAllUpcomingFromSupabase(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch all upcoming meetups directly from the table
      const { data: meetups, error } = await supabase
        .from('meetups')
        .select(`
          *
        `)
        .eq('status', 'active')
        .gte('meetup_date', today)
        .order('meetup_date', { ascending: true });

      if (error) throw error;

      // Upsert each meetup and fetch related data separately
      if (meetups) {
        for (const meetup of meetups) {
          await this.upsertFromRemote(meetup);

          // Fetch attendees with profiles separately
          const { data: attendeesData } = await supabase
            .from('meetup_attendees')
            .select(`
              user_id,
              status,
              joined_at
            `)
            .eq('meetup_id', meetup.id)
            .eq('status', 'confirmed');

          // Fetch profile data for each attendee
          const attendees = await Promise.all(
            (attendeesData || []).map(async (a: any) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', a.user_id)
                .single();

              return {
                user_id: a.user_id,
                username: profile?.username,
                avatar_url: profile?.avatar_url,
                status: a.status,
                joined_at: a.joined_at
              };
            })
          );
          await this.syncAttendees(meetup.id, attendees);

          // Fetch episode relationships
          const { data: episodeMeetupsData } = await supabase
            .from('episode_meetups')
            .select(`
              episode_id,
              relevance_note
            `)
            .eq('meetup_id', meetup.id);

          // Fetch episode and podcast data
          const relatedEpisodes = await Promise.all(
            (episodeMeetupsData || []).map(async (em: any) => {
              const { data: episode } = await supabase
                .from('podcast_episodes')
                .select('id, episode_title, podcast_title, artwork_url')
                .eq('id', em.episode_id)
                .single();

              return {
                episode_id: em.episode_id,
                episode_title: episode?.episode_title,
                podcast_title: episode?.podcast_title,
                artwork_url: episode?.artwork_url,
                relevance_note: em.relevance_note
              };
            })
          );
          await this.syncEpisodeMeetups(meetup.id, relatedEpisodes);
        }
      }
    } catch (error) {
      console.error('Error syncing all upcoming meetups from Supabase:', error);
      throw error;
    }
  }

  private async syncEpisodeMeetups(meetupId: string, relatedEpisodes: any[]): Promise<void> {
    if (!relatedEpisodes || relatedEpisodes.length === 0) return;

    const episodeMeetupCollection = this.episodeMeetupCollection;

    try {
      await this.database.write(async function syncMeetupEpisodeRelationships() {
        // Clear existing episode-meetup relationships for this meetup
        const existingRelations = await episodeMeetupCollection
          .query(Q.where('meetup_id', meetupId))
          .fetch();

        await Promise.all(
          existingRelations.map((relation: EpisodeMeetup) => relation.destroyPermanently())
        );

        // Create new relationships
        for (const episode of relatedEpisodes) {
          if (episode && episode.episode_id) {
            await episodeMeetupCollection.create((record: EpisodeMeetup) => {
              record._raw.id = `${episode.episode_id}_${meetupId}`;
              record.episodeId = episode.episode_id;
              record.meetupId = meetupId;
              record.relevanceNote = episode.relevance_note || null;
            });
          }
        }
      });
    } catch (error) {
      console.error('Error syncing episode-meetup relationships:', error);
    }
  }

  private async syncAttendees(meetupId: string, attendees: any[]): Promise<void> {
    if (!attendees || attendees.length === 0) return;

    const attendeeCollection = this.attendeeCollection;

    try {
      await this.database.write(async function syncMeetupAttendees() {
        // Clear existing attendees for this meetup
        const existingAttendees = await attendeeCollection
          .query(Q.where('meetup_id', meetupId))
          .fetch();

        await Promise.all(
          existingAttendees.map((attendee: MeetupAttendee) => attendee.destroyPermanently())
        );

        // Create new attendees
        for (const attendee of attendees) {
          if (attendee && attendee.user_id) {
            await attendeeCollection.create((record: MeetupAttendee) => {
              record._raw.id = `${meetupId}_${attendee.user_id}`;
              record.meetupId = meetupId;
              record.userId = attendee.user_id;
              record.username = attendee.username;
              record.avatarUrl = attendee.avatar_url;
              record.status = attendee.status || 'confirmed';
              record.joinedAt = attendee.joined_at ? new Date(attendee.joined_at).getTime() : Date.now();
            });
          }
        }
      });
    } catch (error) {
      console.error('Error syncing attendees:', error);
    }
  }

  async getAttendeesForMeetup(meetupId: string): Promise<MeetupAttendee[]> {
    return await this.attendeeCollection
      .query(Q.where('meetup_id', meetupId))
      .fetch();
  }

  async getRelatedEpisodesForMeetup(meetupId: string): Promise<any[]> {
    try {
      // Get episode_meetups relationships
      const episodeMeetups = await this.episodeMeetupCollection
        .query(Q.where('meetup_id', meetupId))
        .fetch();

      console.log(`Found ${episodeMeetups.length} episode_meetup relationships for meetup ${meetupId}`);

      if (episodeMeetups.length === 0) return [];

      // Get all attendees for this meetup
      const attendees = await this.getAttendeesForMeetup(meetupId);
      const attendeeUserIds = attendees.map(a => a.userId);
      console.log(`Found ${attendees.length} attendees for meetup ${meetupId}:`, attendeeUserIds);

      // Fetch episode details from Supabase since they might not be in local DB
      const relatedEpisodes = await Promise.all(
        episodeMeetups.map(async (em: any) => {
          try {
            console.log('Fetching episode from Supabase:', em.episodeId);
            const { data: episode, error } = await supabase
              .from('podcast_episodes')
              .select('id, episode_title, podcast_title, artwork_url')
              .eq('id', em.episodeId)
              .single();

            if (error || !episode) {
              console.log('Episode not found in Supabase:', em.episodeId, error);
              return null;
            }

            // Fetch listening data for attendees for this episode (only if there are attendees)
            let progressData = null;
            if (attendeeUserIds.length > 0) {
              const result = await supabase
                .from('user_episode_progress')
                .select('user_id, current_position, total_duration, percentage_complete')
                .eq('episode_id', em.episodeId)
                .in('user_id', attendeeUserIds);

              progressData = result.data;
              console.log(`Progress data for episode ${em.episodeId}:`, progressData);
            }

            // Map progress data to attendees who have listened
            const attendeesWhoListened = (progressData || [])
              .filter(p => {
                console.log(`Checking progress for user ${p.user_id}: position=${p.current_position}, total=${p.total_duration}`);
                return p.current_position > 0; // Has started listening
              })
              .map(p => {
                const attendee = attendees.find(a => a.userId === p.user_id);
                console.log(`Mapping listener: user_id=${p.user_id}, attendee found:`, attendee);
                return {
                  user_id: p.user_id,
                  username: attendee?.username,
                  avatar_url: attendee?.avatarUrl,
                  progress: p.percentage_complete || 0,
                  completed: p.percentage_complete >= 95 // Consider 95%+ as completed
                };
              });

            console.log(`Final attendeesWhoListened for episode ${em.episodeId}:`, attendeesWhoListened);

            const result = {
              episode_id: episode.id,
              episode_title: episode.episode_title,
              podcast_title: episode.podcast_title,
              artwork_url: episode.artwork_url,
              relevance_note: em.relevanceNote,
              attendees_who_listened: attendeesWhoListened
            };
            console.log('Found episode:', result);
            return result;
          } catch (error) {
            console.log('Error fetching episode:', em.episodeId, error);
            return null;
          }
        })
      );

      // Filter out any null values (episodes that weren't found)
      const filtered = relatedEpisodes.filter(ep => ep !== null);
      console.log(`Returning ${filtered.length} related episodes for meetup ${meetupId}`);
      return filtered;
    } catch (error) {
      console.error('Error getting related episodes for meetup:', error);
      return [];
    }
  }

  async getUserStatusForMeetup(meetupId: string, userId: string): Promise<'confirmed' | 'waitlist' | null> {
    const attendees = await this.attendeeCollection
      .query(
        Q.where('meetup_id', meetupId),
        Q.where('user_id', userId)
      )
      .fetch();

    const attendee = attendees[0];
    return attendee ? attendee.status : null;
  }

  async createMeetup(data: any, episodeIds: string[] = []): Promise<Meetup> {
    try {
      // First create in Supabase
      const { data: newMeetup, error } = await supabase
        .from('meetups')
        .insert({
          ...data,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Associate with episodes if provided
      if (episodeIds.length > 0) {
        for (const episodeId of episodeIds) {
          await supabase.rpc('associate_episode_meetup', {
            p_episode_id: episodeId,
            p_meetup_id: newMeetup.id,
            p_relevance_note: null
          });
        }
      }

      // Then create locally
      const localMeetup = await this.upsertFromRemote(newMeetup);

      // Create local episode-meetup relationships
      if (episodeIds.length > 0) {
        const episodeMeetupCollection = this.episodeMeetupCollection;
        await this.database.write(async function createLocalEpisodeMeetupRelationships() {
          for (const episodeId of episodeIds) {
            await episodeMeetupCollection.create((record: EpisodeMeetup) => {
              record._raw.id = `${episodeId}_${newMeetup.id}`;
              record.episodeId = episodeId;
              record.meetupId = newMeetup.id;
            });
          }
        });
      }

      return localMeetup;
    } catch (error) {
      console.error('Error creating meetup:', error);
      throw error;
    }
  }

  async associateEpisodeWithMeetup(episodeId: string, meetupId: string, relevanceNote?: string): Promise<void> {
    try {
      // Associate in Supabase
      await supabase.rpc('associate_episode_meetup', {
        p_episode_id: episodeId,
        p_meetup_id: meetupId,
        p_relevance_note: relevanceNote
      });

      // Create local relationship
      const episodeMeetupCollection = this.episodeMeetupCollection;
      await this.database.write(async function createEpisodeMeetupAssociation() {
        await episodeMeetupCollection.create((record: EpisodeMeetup) => {
          record._raw.id = `${episodeId}_${meetupId}`;
          record.episodeId = episodeId;
          record.meetupId = meetupId;
          record.relevanceNote = relevanceNote;
        });
      });
    } catch (error) {
      console.error('Error associating episode with meetup:', error);
      throw error;
    }
  }

  async joinMeetup(meetupId: string, userId: string): Promise<'confirmed' | 'waitlist' | 'already_joined'> {
    try {
      const { data, error } = await supabase
        .rpc('join_meetup', {
          p_meetup_id: meetupId,
          p_user_id: userId
        });

      if (error) throw error;

      // Sync the meetup to get updated attendees
      // Get any episode associated with this meetup to trigger sync
      const episodeMeetups = await this.episodeMeetupCollection
        .query(Q.where('meetup_id', meetupId))
        .fetch();

      const episodeMeetup = episodeMeetups[0];
      if (episodeMeetup) {
        await this.syncFromSupabase(episodeMeetup.episodeId, true); // Force refresh after joining
      }

      return data as 'confirmed' | 'waitlist' | 'already_joined';
    } catch (error) {
      console.error('Error joining meetup:', error);
      throw error;
    }
  }

  async leaveMeetup(meetupId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('leave_meetup', {
          p_meetup_id: meetupId,
          p_user_id: userId
        });

      if (error) throw error;

      // Remove attendee locally
      const attendees = await this.attendeeCollection
        .query(
          Q.where('meetup_id', meetupId),
          Q.where('user_id', userId)
        )
        .fetch();

      const attendee = attendees[0];
      if (attendee) {
        await this.database.write(async function removeMeetupAttendeeLocally() {
          await attendee.destroyPermanently();
        });
      }

      // Sync the meetup to get updated attendees
      // Get any episode associated with this meetup to trigger sync
      const episodeMeetups = await this.episodeMeetupCollection
        .query(Q.where('meetup_id', meetupId))
        .fetch();

      const episodeMeetup = episodeMeetups[0];
      if (episodeMeetup) {
        await this.syncFromSupabase(episodeMeetup.episodeId, true); // Force refresh after leaving
      }

      return data as boolean;
    } catch (error) {
      console.error('Error leaving meetup:', error);
      throw error;
    }
  }

  async cancelMeetup(meetupId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('meetups')
        .update({ status: 'cancelled' })
        .eq('id', meetupId)
        .eq('organizer_id', userId);

      if (error) throw error;

      // Update locally
      await this.update(meetupId, { status: 'cancelled' } as any);
    } catch (error) {
      console.error('Error cancelling meetup:', error);
      throw error;
    }
  }
}