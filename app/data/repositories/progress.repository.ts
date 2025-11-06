import type { Database} from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type UserEpisodeProgress from '../../models/UserEpisodeProgress';
import { BaseRepository } from './base.repository';
import { supabase } from '../../lib/supabase';

interface PendingProgress {
  userId: string;
  episodeId: string;
  position: number;
  duration: number;
}

export class ProgressRepository extends BaseRepository<UserEpisodeProgress> {
  private pendingSyncs = new Map<string, PendingProgress>();
  private flushTimer?: NodeJS.Timeout;
  private readonly FLUSH_DEBOUNCE = 30000; // Auto-flush after 30s of no new saves

  constructor(database: Database) {
    super(database, 'user_episode_progress');
  }

  async getProgress(userId: string, episodeId: string): Promise<UserEpisodeProgress | null> {
    const progress = await this.database
      .get<UserEpisodeProgress>('user_episode_progress')
      .query(
        Q.where('user_id', userId),
        Q.where('episode_id', episodeId)
      )
      .fetch();

    return progress[0] || null;
  }

  async saveProgress(
    userId: string,
    episodeId: string,
    position: number,
    duration: number
  ): Promise<UserEpisodeProgress> {
    const collection = this.database.get<UserEpisodeProgress>('user_episode_progress');

    // Check if progress exists
    const existing = await this.getProgress(userId, episodeId);

    if (existing) {
      // Update existing progress
      const updated = await this.database.write(async function updateExistingProgress() {
        return await existing.update((progress) => {
          progress.currentPosition = position;
          progress.totalDuration = duration;
          progress.lastPlayedAt = Date.now();
          progress.completed = duration > 0 && position >= duration * 0.95; // Mark as completed if >95% watched
          progress.needsSync = true;
        });
      });

      // Track for batched sync (NEW)
      const key = `${userId}_${episodeId}`;
      this.pendingSyncs.set(key, { userId, episodeId, position, duration });

      // Auto-flush after debounce period (NEW)
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => this.flushPendingSyncs(), this.FLUSH_DEBOUNCE);

      return updated;
    } else {
      // Create new progress
      const created = await this.database.write(async function createNewProgress() {
        return await collection.create((progress) => {
          progress.userId = userId;
          progress.episodeId = episodeId;
          progress.currentPosition = position;
          progress.totalDuration = duration;
          progress.lastPlayedAt = Date.now();
          progress.completed = false;
          progress.needsSync = true;
        });
      });

      // Track for batched sync (NEW)
      const key = `${userId}_${episodeId}`;
      this.pendingSyncs.set(key, { userId, episodeId, position, duration });

      // Auto-flush after debounce period (NEW)
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => this.flushPendingSyncs(), this.FLUSH_DEBOUNCE);

      return created;
    }
  }

  private async syncToSupabase(userId: string, episodeId: string, position: number, duration: number) {
    try {
      // Use the RPC function to upsert progress
      const { data, error } = await supabase.rpc('upsert_episode_progress', {
        p_episode_id: episodeId,
        p_current_position: position,
        p_total_duration: duration,
      });

      if (error) {
        console.error('Failed to sync progress to Supabase:', error);
        return; // Don't mark as synced if there was an error
      }

      // Mark as synced
      const progress = await this.getProgress(userId, episodeId);
      if (progress) {
        await this.database.write(async function markProgressAsSynced() {
          await progress.update((p) => {
            p.needsSync = false;
            p.syncedAt = new Date();
          });
        });
      }
    } catch (error) {
      console.error('Error syncing progress to Supabase:', error);
    }
  }

  /**
   * Flushes all pending progress syncs to Supabase.
   * This should be called on pause, app background, or when progress reaches milestones.
   */
  async flushPendingSyncs(): Promise<void> {
    const syncs = Array.from(this.pendingSyncs.values());

    if (syncs.length === 0) {
      return;
    }

    console.log(`📤 Flushing ${syncs.length} pending progress update(s) to Supabase`);

    // Clear the pending syncs and timer
    this.pendingSyncs.clear();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Sync all pending progress updates in parallel
    const results = await Promise.allSettled(
      syncs.map(sync =>
        this.syncToSupabase(sync.userId, sync.episodeId, sync.position, sync.duration)
      )
    );

    // Log results
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (failed > 0) {
      console.warn(`⚠️ Progress flush completed: ${succeeded} succeeded, ${failed} failed`);
    } else {
      console.log(`✅ Progress flush completed: ${succeeded} update(s) synced successfully`);
    }
  }

  async loadFromSupabase(userId: string, episodeId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('user_episode_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .single();

      if (data && !error) {
        await this.saveProgress(userId, episodeId, data.current_position, data.total_duration);
      }
    } catch (error) {
      console.error('Error loading progress from Supabase:', error);
    }
  }

  async getAllUnsyncedProgress(): Promise<UserEpisodeProgress[]> {
    return await this.database
      .get<UserEpisodeProgress>('user_episode_progress')
      .query(Q.where('needs_sync', true))
      .fetch();
  }

  async syncAllProgress(): Promise<void> {
    const unsynced = await this.getAllUnsyncedProgress();

    for (const progress of unsynced) {
      await this.syncToSupabase(
        progress.userId,
        progress.episodeId,
        progress.currentPosition,
        progress.totalDuration
      );
    }
  }

  async syncFromSupabase(userId?: string): Promise<void> {
    try {
      // Get the current user if not provided
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user logged in, cannot sync progress');
          return;
        }
        userId = user.id;
      }

      // Fetch all progress from Supabase for this user
      const { data: remoteProgress, error } = await supabase
        .from('user_episode_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching progress from Supabase:', error);
        return;
      }

      if (!remoteProgress || remoteProgress.length === 0) {
        console.log('No remote progress found for user');
        return;
      }

      console.log(`Syncing ${remoteProgress.length} progress records from Supabase`);

      // Process each remote progress record
      for (const remote of remoteProgress) {
        // Get local progress if it exists
        const local = await this.getProgress(userId, remote.episode_id);

        // Parse dates for comparison
        const remoteUpdated = new Date(remote.last_updated).getTime();
        const localUpdated = local?.updatedAt?.getTime() || 0;

        // Only sync if remote is newer than local (or local doesn't exist)
        if (remoteUpdated > localUpdated) {
          console.log(`Syncing progress for episode ${remote.episode_id} (remote is newer)`);

          if (local) {
            // Update existing local record
            await this.database.write(async function updateProgressFromSupabase() {
              await local.update((progress) => {
                progress.currentPosition = remote.current_position;
                progress.totalDuration = remote.total_duration;
                progress.completed = remote.percentage_complete >= 95;
                progress.lastPlayedAt = new Date(remote.last_updated).getTime();
                progress.needsSync = false;
                progress.syncedAt = new Date();
              });
            });
          } else {
            // Create new local record
            const collection = this.database.get<UserEpisodeProgress>('user_episode_progress');
            await this.database.write(async function createProgressFromSupabase() {
              await collection.create((progress) => {
                progress.userId = userId!;
                progress.episodeId = remote.episode_id;
                progress.currentPosition = remote.current_position;
                progress.totalDuration = remote.total_duration;
                progress.completed = remote.percentage_complete >= 95;
                progress.lastPlayedAt = new Date(remote.last_updated).getTime();
                progress.needsSync = false;
                progress.syncedAt = new Date();
              });
            });
          }
        } else {
          console.log(`Skipping episode ${remote.episode_id} (local is newer or same)`);
        }
      }

      console.log('Progress sync from Supabase completed');
    } catch (error) {
      console.error('Error syncing progress from Supabase:', error);
      throw error;
    }
  }
}