import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type { Observable } from '@nozbe/watermelondb/utils/rx';
import { BaseRepository } from './base.repository';
import type WeeklySelection from '../models/weekly-selection.model';
import { supabase } from '../../lib/supabase';

export class WeeklySelectionRepository extends BaseRepository<WeeklySelection> {
  private lastSyncTime: number = 0;
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(database: Database) {
    super(database, 'weekly_selections');
  }

  async upsertFromRemote(remoteData: any): Promise<WeeklySelection> {
    const existing = await this.findById(remoteData.id);

    // Flatten the data structure - use snake_case for database fields
    const flatData = {
      week_start: remoteData.week_start,
      episode_id: remoteData.episode_id,
      order_position: remoteData.order_position,
      // Flatten episode data if present
      episode_title: remoteData.podcast_episode?.episode_title || '',
      podcast_title: remoteData.podcast_episode?.podcast_title || '',
      episode_description: remoteData.podcast_episode?.episode_description || '',
      audio_url: remoteData.podcast_episode?.audio_url || '',
      artwork_url: remoteData.podcast_episode?.artwork_url || null,
      duration: remoteData.podcast_episode?.duration || 0,
      category: remoteData.podcast_episode?.category || '',
      published_at: remoteData.podcast_episode?.published_at || '',
      synced_at: Date.now(),  
      needs_sync: false,
    };

    if (existing) {
      return await this.update(remoteData.id, flatData as any);
    } else {
      const created = await this.create({
        id: remoteData.id,
        ...flatData,
      } as any);
      return created;
    }
  }

  async markForSync(id: string): Promise<void> {
    await this.update(id, { needsSync: true } as any);
  }

  async getCurrentWeekSelections(): Promise<WeeklySelection[]> {
    const weekStart = this.getWeekStart();
    return await this.query([
      Q.where('week_start', weekStart),
      Q.sortBy('order_position', Q.asc),
    ]);
  }

  observeCurrentWeekSelections(): Observable<WeeklySelection[]> {
    const weekStart = this.getWeekStart();
    return this.observeQuery([
      Q.where('week_start', weekStart),
      Q.sortBy('order_position', Q.asc),
    ]);
  }

  async getUserWeeklyChoice(userId: string): Promise<string | null> {
    const weekStart = this.getWeekStart();

    try {
      const userChoicesCollection = this.database.get('user_weekly_choices');
      const choices = await userChoicesCollection
        .query(
          Q.where('user_id', userId),
          Q.where('week_start', weekStart),
          Q.sortBy('chosen_at', Q.desc)
        )
        .fetch();

      return choices.length > 0 ? (choices[0] as any).episodeId : null;
    } catch (error) {
      console.error('Failed to fetch user weekly choice:', error);
      return null;
    }
  }

  async getUserWeeklyChoices(userId: string): Promise<string[]> {
    const weekStart = this.getWeekStart();

    try {
      const userChoicesCollection = this.database.get('user_weekly_choices');
      const choices = await userChoicesCollection
        .query(
          Q.where('user_id', userId),
          Q.where('week_start', weekStart),
          Q.sortBy('chosen_at', Q.desc)
        )
        .fetch();

      const episodeIds = choices.map((choice: any) => choice.episodeId);
      // Return unique episode IDs only (in case there are duplicates)
      return Array.from(new Set(episodeIds));
    } catch (error) {
      console.error('Failed to fetch user weekly choices:', error);
      return [];
    }
  }

  async getAllUserWeeklyChoices(userId: string): Promise<Array<{
    episodeId: string;
    weekStart: string;
    chosenAt: Date;
    episodeTitle?: string;
    podcastTitle?: string;
    artworkUrl?: string;
    audioUrl?: string;
    description?: string;
    duration?: number;
  }>> {
    try {
      const userChoicesCollection = this.database.get('user_weekly_choices');
      const choices = await userChoicesCollection
        .query(
          Q.where('user_id', userId),
          Q.sortBy('chosen_at', Q.desc)
        )
        .fetch();

      // Fetch episode details for each choice
      const choicesWithDetails = await Promise.all(
        choices.map(async (choice: any) => {
          try {
            // Get the weekly selection that contains episode details
            const weeklySelections = await this.query([
              Q.where('episode_id', choice.episodeId),
              Q.where('week_start', choice.weekStart),
            ]);

            const selection = weeklySelections[0];

            return {
              episodeId: choice.episodeId,
              weekStart: choice.weekStart,
              chosenAt: new Date(choice.chosenAt),
              episodeTitle: selection?.episodeTitle,
              podcastTitle: selection?.podcastTitle,
              artworkUrl: selection?.artworkUrl,
              audioUrl: selection?.audioUrl,
              description: selection?.episodeDescription,
              duration: selection?.duration,
            };
          } catch (error) {
            console.error(`Failed to fetch details for episode ${choice.episodeId}:`, error);
            return {
              episodeId: choice.episodeId,
              weekStart: choice.weekStart,
              chosenAt: new Date(choice.chosenAt),
            };
          }
        })
      );

      return choicesWithDetails;
    } catch (error) {
      console.error('Failed to fetch all user weekly choices:', error);
      return [];
    }
  }

  async saveUserWeeklyChoice(userId: string, episodeId: string): Promise<boolean> {
    const weekStart = this.getWeekStart();

    try {
      // Save to local database with needs_sync flag
      const database = this.database;
      await this.database.write(async function saveUserWeeklyChoiceLocally() {
        const userChoicesCollection = database.get('user_weekly_choices');
        const existing = await userChoicesCollection
          .query(
            Q.where('user_id', userId),
            Q.where('week_start', weekStart)
          )
          .fetch();

        if (existing.length > 0) {
          await existing[0].update((choice: any) => {
            choice.episodeId = episodeId;
            choice.chosenAt = Date.now();
            choice.updatedAt = Date.now();
            choice.needsSync = true; // Mark for sync
          });
        } else {
          await userChoicesCollection.create((choice: any) => {
            choice._raw.user_id = userId;
            choice._raw.episode_id = episodeId;
            choice._raw.week_start = weekStart;
            choice._raw.chosen_at = Date.now();
            choice._raw.created_at = Date.now();
            choice._raw.updated_at = Date.now();
            choice._raw.needs_sync = true; // Mark for sync
          });
        }
      });

      // Trigger sync in background (non-blocking)
      this.syncUserChoices().catch(console.error);

      return true;
    } catch (error) {
      console.error('Failed to save user weekly choice:', error);
      return false;
    }
  }

  async getEpisodeMemberCount(episodeId: string): Promise<number> {
    try {
      const weekStart = this.getWeekStart();
      const userChoicesCollection = this.database.get('user_weekly_choices');
      const choices = await userChoicesCollection
        .query(
          Q.where('episode_id', episodeId),
          Q.where('week_start', weekStart)
        )
        .fetch();

      return choices.length;
    } catch (error) {
      console.error('Failed to fetch member count:', error);
      return 0;
    }
  }

  async syncWithRemote(force = false): Promise<void> {
    const weekStart = this.getWeekStart();

    // Check cache age
    const cacheAge = Date.now() - this.lastSyncTime;
    if (!force && cacheAge < this.CACHE_TTL) {
      console.log('✅ Weekly selections cache valid, skipping sync');
      return;
    }

    console.log('📥 Weekly selections cache expired or forced, syncing for week start:', weekStart);

    try {
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
        .eq('week_start', weekStart)
        .order('order_position');

      if (error) {
        console.error('Error syncing weekly selections:', error);
        throw error;
      }

      if (data && data.length > 0) {
        // Upsert each item - upsertFromRemote handles its own transactions
        // and now flattens the data internally
        for (const item of data) {
          await this.upsertFromRemote(item);
        }
      }

      // Update cache timestamp after successful sync
      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error('Failed to sync weekly selections:', error);
      throw error;
    }
  }

  async syncUserChoices(): Promise<void> {
    try {
      const userChoicesCollection = this.database.get('user_weekly_choices');
      const needsSync = await userChoicesCollection
        .query(Q.where('needs_sync', true))
        .fetch();

      for (const choice of needsSync) {
        const { error } = await supabase
          .from('user_weekly_choices')
          .upsert({
            user_id: (choice as any).userId,
            episode_id: (choice as any).episodeId,
            week_start: (choice as any).weekStart,
            chosen_at: new Date((choice as any).chosenAt).toISOString(),
          });

        if (!error) {
          await this.database.write(async function markUserWeeklyChoiceAsSynced() {
            await choice.update((c: any) => {
              c.needsSync = false;
              c.syncedAt = Date.now();
            });
          });
        } else {
          console.error('Failed to sync user choice:', error);
        }
      }
    } catch (error) {
      console.error('Failed to sync user choices:', error);
    }
  }

  async syncUserChoicesFromRemote(userId: string): Promise<void> {
    const weekStart = this.getWeekStart();

    try {
      console.log('  → Syncing user weekly choices from remote...');
      const { data, error } = await supabase
        .from('user_weekly_choices')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', weekStart);

      if (error) {
        console.error('Error syncing user weekly choices:', error);
        throw error;
      }

      if (data && data.length > 0) {
        const userChoicesCollection = this.database.get('user_weekly_choices');
        const database = this.database;

        for (const remoteChoice of data) {
          await database.write(async function upsertUserWeeklyChoiceFromRemote() {
            const existing = await userChoicesCollection
              .query(
                Q.where('user_id', remoteChoice.user_id),
                Q.where('episode_id', remoteChoice.episode_id),
                Q.where('week_start', remoteChoice.week_start)
              )
              .fetch();

            if (existing.length > 0) {
              await existing[0].update((choice: any) => {
                choice.chosenAt = new Date(remoteChoice.chosen_at).getTime();
                choice.syncedAt = Date.now();
                choice.needsSync = false;
              });
            } else {
              await userChoicesCollection.create((choice: any) => {
                choice._raw.user_id = remoteChoice.user_id;
                choice._raw.episode_id = remoteChoice.episode_id;
                choice._raw.week_start = remoteChoice.week_start;
                choice._raw.chosen_at = new Date(remoteChoice.chosen_at).getTime();
                choice._raw.created_at = Date.now();
                choice._raw.updated_at = Date.now();
                choice._raw.synced_at = Date.now();
                choice._raw.needs_sync = false;
              });
            }
          });
        }
        console.log(`  ✓ Synced ${data.length} user weekly choice(s)`);
      }
    } catch (error) {
      console.error('Failed to sync user weekly choices from remote:', error);
      throw error;
    }
  }

  async pushLocalChanges(): Promise<void> {
    const needsSync = await this.query([Q.where('needs_sync', true)]);

    for (const selection of needsSync) {
      try {
        const { error } = await supabase
          .from('weekly_selections')
          .upsert({
            id: selection.id,
            week_start: selection.weekStart,
            episode_id: selection.episodeId,
            order_position: selection.orderPosition,
            created_at: new Date(selection.createdAt).toISOString(),
            updated_at: new Date(selection.updatedAt).toISOString(),
          });

        if (!error) {
          await this.update(selection.id, {
            needsSync: false,
            syncedAt: Date.now()
          } as any);
        }
      } catch (error) {
        console.error(`Failed to sync selection ${selection.id}:`, error);
      }
    }
  }

  // Override to use snake_case fields
  protected prepareCreate(data: any): any {
    return {
      ...data,
      created_at: data.created_at || Date.now(),
      updated_at: data.updated_at || Date.now(),
    };
  }

  protected prepareUpdate(data: any): any {
    return {
      ...data,
      updated_at: Date.now(),
    };
  }

  private getWeekStart(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();

    let diff;
    if (dayOfWeek === 0) {
      diff = 6;
    } else {
      diff = dayOfWeek - 1;
    }

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    const year = weekStart.getFullYear();
    const month = String(weekStart.getMonth() + 1).padStart(2, '0');
    const day = String(weekStart.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    console.log('Week start date:', date);
    return date;
  }
}

export const createWeeklySelectionRepository = (database: Database) => {
  return new WeeklySelectionRepository(database);
};