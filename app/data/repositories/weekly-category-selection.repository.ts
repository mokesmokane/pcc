import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type { Observable } from '@nozbe/watermelondb/utils/rx';
import { BaseRepository } from './base.repository';
import type WeeklyCategorySelection from '../models/weekly-category-selection.model';
import { supabase } from '../../lib/supabase';

export class WeeklyCategorySelectionRepository extends BaseRepository<WeeklyCategorySelection> {
  private lastSyncTime: number = 0;
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(database: Database) {
    super(database, 'weekly_category_selections');
  }

  async upsertFromRemote(remoteData: any): Promise<WeeklyCategorySelection> {
    // Flatten the data structure - use snake_case for database fields
    const flatData = {
      week_start: remoteData.week_start,
      category: remoteData.category,
      episode_id: remoteData.episode_id,
      // Flatten episode data if present
      episode_title: remoteData.podcast_episode?.episode_title || '',
      podcast_title: remoteData.podcast_episode?.podcast_title || '',
      episode_description: remoteData.podcast_episode?.episode_description || '',
      audio_url: remoteData.podcast_episode?.audio_url || '',
      artwork_url: remoteData.podcast_episode?.artwork_url || null,
      duration: remoteData.podcast_episode?.duration || 0,
      published_at: remoteData.podcast_episode?.published_at || '',
      synced_at: Date.now(),
      needs_sync: false,
    };

    try {
      const existing = await this.findById(remoteData.id);

      if (existing) {
        return await this.update(remoteData.id, flatData as any);
      } else {
        const created = await this.create({
          id: remoteData.id,
          ...flatData,
        } as any);
        return created;
      }
    } catch (error: any) {
      // Handle race condition where record was created between findById and create
      if (error?.message?.includes('SQLITE_CONSTRAINT_PRIMARYKEY') ||
          error?.message?.includes('UNIQUE constraint failed')) {
        console.warn(`[WeeklyCategorySelection] Record ${remoteData.id} already exists, updating instead`);

        // Retry with update
        const existing = await this.findById(remoteData.id);
        if (existing) {
          return await this.update(remoteData.id, flatData as any);
        }
      }
      throw error;
    }
  }

  async getCurrentWeekCategorySelections(): Promise<WeeklyCategorySelection[]> {
    const weekStart = this.getWeekStart();
    return await this.query([
      Q.where('week_start', weekStart),
    ]);
  }

  observeCurrentWeekCategorySelections(): Observable<WeeklyCategorySelection[]> {
    const weekStart = this.getWeekStart();
    return this.observeQuery([
      Q.where('week_start', weekStart),
    ]);
  }

  async getSelectionByCategory(category: string): Promise<WeeklyCategorySelection | null> {
    const weekStart = this.getWeekStart();
    const selections = await this.query([
      Q.where('week_start', weekStart),
      Q.where('category', category),
    ]);
    return selections.length > 0 ? selections[0] : null;
  }

  async getSelectionsByCategoryNormalized(category: string): Promise<WeeklyCategorySelection | null> {
    // Normalize the category name for matching (lowercase, handle variations)
    const normalizedCategory = this.normalizeCategory(category);
    const weekStart = this.getWeekStart();

    const allSelections = await this.query([
      Q.where('week_start', weekStart),
    ]);

    // Find a match with normalized comparison
    return allSelections.find(s =>
      this.normalizeCategory(s.category) === normalizedCategory
    ) || null;
  }

  private normalizeCategory(category: string): string {
    return category
      .toLowerCase()
      .replace(/[&]/g, 'and')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  async syncWithRemote(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastSyncTime < this.CACHE_TTL) {
      console.log('[WeeklyCategorySelection] Using cached data, skipping sync');
      return;
    }

    try {
      const weekStart = this.getWeekStart();
      console.log(`[WeeklyCategorySelection] Syncing for week: ${weekStart}`);

      const { data, error } = await supabase
        .from('weekly_category_selections')
        .select(`
          *,
          podcast_episode:podcast_episodes(
            episode_title,
            podcast_title,
            episode_description,
            audio_url,
            artwork_url,
            duration,
            published_at
          )
        `)
        .eq('week_start', weekStart);

      if (error) {
        console.error('[WeeklyCategorySelection] Sync error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log(`[WeeklyCategorySelection] Syncing ${data.length} category selections`);

        for (const item of data) {
          await this.upsertFromRemote(item);
        }
      }

      this.lastSyncTime = now;
    } catch (error) {
      console.error('[WeeklyCategorySelection] Failed to sync:', error);
      throw error;
    }
  }

  private getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    // Monday = 1, Sunday = 0
    // If Sunday, go back 6 days. Otherwise go back (day - 1) days
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);

    // Format as YYYY-MM-DD
    return monday.toISOString().split('T')[0];
  }
}

// Singleton instance
let instance: WeeklyCategorySelectionRepository | null = null;

export function getWeeklyCategorySelectionRepository(database: Database): WeeklyCategorySelectionRepository {
  if (!instance) {
    instance = new WeeklyCategorySelectionRepository(database);
  }
  return instance;
}
