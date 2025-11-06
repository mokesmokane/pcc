import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@nozbe/watermelondb';
import { WeeklySelectionRepository } from '@/data/repositories/weekly-selection.repository';
import { ChapterRepository } from '@/data/repositories/chapter.repository';
import { EpisodeDetailsRepository } from '@/data/repositories/episode-details.repository';
import { TranscriptSegmentRepository } from '@/data/repositories/transcript-segment.repository';

type TableHandler = (payload: any) => Promise<void>;

export class RealtimeManager {
  private channels = new Map<string, RealtimeChannel>();
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async initialize() {
    console.log('🔌 Initializing Realtime subscriptions...');

    // Subscribe to weekly selections (Postgres Changes - public data)
    this.subscribeToPostgresChanges('weekly_selections', async (payload) => {
      const repo = new WeeklySelectionRepository(this.database);
      await this.handleWeeklySelectionUpdate(repo, payload);
    });

    // Subscribe to chapters (Postgres Changes - admin-controlled content)
    this.subscribeToPostgresChanges('chapters', async (payload) => {
      const repo = new ChapterRepository(this.database);
      await this.handleChapterUpdate(repo, payload);
    });

    // Subscribe to episode details (Postgres Changes - admin editorial content)
    this.subscribeToPostgresChanges('episode_details', async (payload) => {
      const repo = new EpisodeDetailsRepository(this.database);
      await this.handleEpisodeDetailsUpdate(repo, payload);
    });

    // Subscribe to transcript segments (Postgres Changes - admin-controlled content)
    this.subscribeToPostgresChanges('transcript_segments', async (payload) => {
      const repo = new TranscriptSegmentRepository(this.database);
      await this.handleTranscriptSegmentUpdate(repo, payload);
    });

    // Note: Notifications are handled by NotificationService using Broadcast
    // See app/services/notification.service.ts:subscribeToNotifications()

    console.log('✅ Realtime subscriptions active');
  }

  private subscribeToPostgresChanges(table: string, handler: TableHandler) {
    const channel = supabase
      .channel(`db-changes:${table}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
      }, async (payload) => {
        console.log(`🔔 Postgres Changes: ${table}`, payload);
        await handler(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to Postgres Changes: ${table}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to ${table}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ Subscription to ${table} timed out`);
        }
      });

    this.channels.set(table, channel);
  }

  private async handleWeeklySelectionUpdate(
    repo: WeeklySelectionRepository,
    payload: any
  ) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    try {
      await this.database.write(async function handleRealtimeWeeklySelectionChange() {
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          // Fetch the full record with episode details
          const { data, error } = await supabase
            .from('weekly_selections')
            .select(`
              *,
              podcast_episode:podcast_episodes (
                id,
                episode_title,
                podcast_title,
                episode_description,
                audio_url,
                artwork_url,
                duration,
                category,
                published_at
              )
            `)
            .eq('id', newRecord.id)
            .single();

          if (!error && data) {
            await repo.upsertFromRemote(data);
            console.log(`✅ Updated weekly selection: ${newRecord.id}`);
          }
        } else if (eventType === 'DELETE') {
          await repo.delete(oldRecord.id);
          console.log(`🗑️ Deleted weekly selection: ${oldRecord.id}`);
        }
      });
    } catch (error) {
      console.error('Failed to handle weekly selection update:', error);
    }
  }

  private async handleChapterUpdate(
    repo: ChapterRepository,
    payload: any
  ) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    try {
      console.log(`📝 Processing chapter ${eventType}:`, newRecord?.id);

      // Don't wrap in database.write() - upsertFromRemote/delete already do this
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        console.log(`⚙️ Calling upsertFromRemote for chapter ${newRecord.id}`);
        const result = await repo.upsertFromRemote(newRecord);
        console.log(`✅ Updated chapter: ${newRecord.id} for episode ${newRecord.episode_id}`);
      } else if (eventType === 'DELETE') {
        await repo.delete(String(oldRecord.id));
        console.log(`🗑️ Deleted chapter: ${oldRecord.id}`);
      }

      console.log(`✔️ Chapter update completed`);
    } catch (error) {
      console.error('❌ Failed to handle chapter update:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
  }

  private async handleEpisodeDetailsUpdate(
    repo: EpisodeDetailsRepository,
    payload: any
  ) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    try {
      // Don't wrap in database.write() - the update/create methods already do this
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        // Episode details uses a different structure
        const existing = await repo.getEpisodeDetails(newRecord.episode_id);

        await this.database.write(async function handleRealtimeEpisodeDetailsChange() {
          if (existing) {
            await existing.update((details: any) => {
              details.about = newRecord.about || '';
              details.whyWeLoveIt = newRecord.why_we_love_it || '';
              details.syncedAt = Date.now();
              details.needsSync = false;
            });
          } else {
            const collection = repo.collection;
            await collection.create((details: any) => {
              details.episodeId = newRecord.episode_id;
              details.about = newRecord.about || '';
              details.whyWeLoveIt = newRecord.why_we_love_it || '';
              details.syncedAt = Date.now();
              details.needsSync = false;
            });
          }
        });
        console.log(`✅ Updated episode details for episode ${newRecord.episode_id}`);
      } else if (eventType === 'DELETE') {
        const existing = await repo.getEpisodeDetails(oldRecord.episode_id);
        if (existing) {
          await this.database.write(async function deleteEpisodeDetails() {
            await existing.destroyPermanently();
          });
          console.log(`🗑️ Deleted episode details for episode ${oldRecord.episode_id}`);
        }
      }
    } catch (error) {
      console.error('Failed to handle episode details update:', error);
    }
  }

  private async handleTranscriptSegmentUpdate(
    repo: TranscriptSegmentRepository,
    payload: any
  ) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    try {
      // Don't wrap in database.write() - upsertFromRemote/delete already do this
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        await repo.upsertFromRemote(newRecord);
        console.log(`✅ Updated transcript segment: ${newRecord.id} for episode ${newRecord.episode_id}`);
      } else if (eventType === 'DELETE') {
        await repo.delete(String(oldRecord.id));
        console.log(`🗑️ Deleted transcript segment: ${oldRecord.id}`);
      }
    } catch (error) {
      console.error('Failed to handle transcript segment update:', error);
    }
  }

  async cleanup() {
    for (const [table, channel] of this.channels) {
      await channel.unsubscribe();
      console.log(`❌ Unsubscribed from ${table}`);
    }
    this.channels.clear();
  }
}
