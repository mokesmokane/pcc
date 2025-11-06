import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';
import { BaseRepository } from './base.repository';
import type Chapter from '../models/chapter.model';
import { supabase } from '../../lib/supabase';

export class ChapterRepository extends BaseRepository<Chapter> {
  private lastSyncTime = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(database: Database) {
    super(database, 'chapters');
  }

  async upsertFromRemote(remoteData: any): Promise<Chapter> {
    // Ensure ID is a string (WatermelonDB requirement)
    const chapterId = String(remoteData.id);
    const existing = await this.findById(chapterId);

    const flatData = {
      episode_id: remoteData.episode_id,
      title: remoteData.title,
      description: remoteData.description,
      start_seconds: remoteData.start_seconds,
      end_seconds: remoteData.end_seconds,
      synced_at: Date.now(),
      needs_sync: false,
    };

    if (existing) {
      return await this.update(chapterId, flatData as any);
    } else {
      return await this.create({
        id: chapterId,
        ...flatData,
        created_at: remoteData.created_at ? new Date(remoteData.created_at).getTime() : Date.now(),
        updated_at: remoteData.updated_at ? new Date(remoteData.updated_at).getTime() : Date.now(),
      } as any);
    }
  }

  async markForSync(id: string): Promise<void> {
    await this.update(id, { needsSync: true } as any);
  }

  async getEpisodeChapters(episodeId: string): Promise<Chapter[]> {
    return await this.query([
      Q.where('episode_id', episodeId),
      Q.sortBy('start_seconds', Q.asc),
    ]);
  }

  observeEpisodeChapters(episodeId: string): Observable<Chapter[]> {
    return this.observeQuery([
      Q.where('episode_id', episodeId),
      Q.sortBy('start_seconds', Q.asc),
    ]);
  }

  async getCurrentChapter(episodeId: string, position: number): Promise<Chapter | null> {
    const chapters = await this.query([
      Q.where('episode_id', episodeId),
      Q.where('start_seconds', Q.lte(position)),
      Q.or(
        Q.where('end_seconds', Q.gt(position)),
        Q.where('end_seconds', null)
      ),
    ]);

    return chapters.length > 0 ? chapters[0] : null;
  }

  observeCurrentChapter(episodeId: string, position: number): Observable<Chapter | null> {
    return new Observable(observer => {
      const subscription = this.observeQuery([
        Q.where('episode_id', episodeId),
        Q.where('start_seconds', Q.lte(position)),
        Q.or(
          Q.where('end_seconds', Q.gt(position)),
          Q.where('end_seconds', null)
        ),
      ]).subscribe(chapters => {
        observer.next(chapters.length > 0 ? chapters[0] : null);
      });

      return () => subscription.unsubscribe();
    });
  }

  async syncWithRemote(episodeId: string, force = false): Promise<void> {
    // Check cache age
    const lastSync = this.lastSyncTime.get(episodeId) || 0;
    const cacheAge = Date.now() - lastSync;

    if (!force && cacheAge < this.CACHE_TTL) {
      console.log(`✅ Chapters cache valid for episode ${episodeId}, skipping sync`);
      return;
    }

    try {
      console.log(`📥 Syncing chapters for episode ${episodeId} (cache age: ${Math.round(cacheAge / 1000)}s)`);

      // Fetch chapters from Supabase
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('episode_id', episodeId)
        .order('start_seconds', { ascending: true });

      // Handle UUID type mismatch (e.g., episode IDs like "substack:post:123")
      if (error && error.code === '22P02') {
        console.log(`ℹ️ Episode ${episodeId} has non-UUID format, no chapters available from remote`);
        this.lastSyncTime.set(episodeId, Date.now());
        return;
      }

      if (error) throw error;

      if (chapters && chapters.length > 0) {
        // Batch upsert all chapters
        const collection = this.collection;
        await this.database.write(async function batchSyncEpisodeChapters() {
          for (const chapter of chapters) {
            // Convert id to string if it's a number
            const chapterId = String(chapter.id);

            // Check if chapter with this specific ID exists
            let existing;
            try {
              existing = await collection.find(chapterId);
            } catch {
              existing = null;
            }

            if (existing) {
              // Update existing chapter
              await existing.update((record: any) => {
                record.episodeId = chapter.episode_id;
                record.title = chapter.title;
                record.description = chapter.description;
                record.startSeconds = Number(chapter.start_seconds);
                record.endSeconds = chapter.end_seconds ? Number(chapter.end_seconds) : null;
                record.syncedAt = Date.now();
                record.needsSync = false;
              });
            } else {
              // Create new chapter
              await collection.create((record: any) => {
                record._raw.id = chapterId;
                record._raw.episode_id = String(chapter.episode_id);
                record._raw.title = String(chapter.title);
                record._raw.description = chapter.description ? String(chapter.description) : null;
                record._raw.start_seconds = Number(chapter.start_seconds);
                record._raw.end_seconds = chapter.end_seconds ? Number(chapter.end_seconds) : null;
                record._raw.created_at = chapter.created_at ? new Date(chapter.created_at).getTime() : Date.now();
                record._raw.updated_at = Date.now();
                record._raw.synced_at = Date.now();
                record._raw.needs_sync = false;
              });
            }
          }
        });

        console.log(`✅ Synced ${chapters.length} chapters for episode ${episodeId}`);
      } else {
        console.log(`ℹ️ No chapters found for episode ${episodeId}`);
      }

      // Update cache timestamp after successful sync (whether or not there were chapters)
      this.lastSyncTime.set(episodeId, Date.now());
    } catch (error) {
      console.error('Failed to sync chapters:', error);
      throw error;
    }
  }

  async deleteEpisodeChapters(episodeId: string): Promise<void> {
    const chapters = await this.getEpisodeChapters(episodeId);
    await this.batchDelete(chapters.map(c => c.id));
  }

  // Helper to find chapter at position
  findChapterAtPosition(chapters: Chapter[], position: number): Chapter | null {
    return chapters.find(
      chapter => {
        if (chapter.endSeconds) {
          return position >= chapter.startSeconds && position < chapter.endSeconds;
        } else {
          // If no end time, check if this is the last chapter or if position is before the next chapter
          const nextChapterIndex = chapters.indexOf(chapter) + 1;
          if (nextChapterIndex < chapters.length) {
            const nextChapter = chapters[nextChapterIndex];
            return position >= chapter.startSeconds && position < nextChapter.startSeconds;
          } else {
            // Last chapter with no end time
            return position >= chapter.startSeconds;
          }
        }
      }
    ) || null;
  }

  // Override to use snake_case fields
  protected prepareCreate(data: any): any {
    return {
      ...data,
      created_at: data.created_at || Date.now(),
      updated_at: data.updated_at || Date.now(),
      needs_sync: data.needs_sync !== undefined ? data.needs_sync : true,
    };
  }

  protected prepareUpdate(data: any): any {
    return {
      ...data,
      updated_at: Date.now(),
    };
  }
}

export const createChapterRepository = (database: Database) => {
  return new ChapterRepository(database);
};