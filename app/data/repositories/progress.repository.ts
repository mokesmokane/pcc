import type { Database} from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';
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

  /**
   * Observe progress for a specific episode
   */
  observeProgress(userId: string, episodeId: string): Observable<UserEpisodeProgress[]> {
    return this.database
      .get<UserEpisodeProgress>('user_episode_progress')
      .query(
        Q.where('user_id', userId),
        Q.where('episode_id', episodeId)
      )
      .observe();
  }

  /**
   * Observe all progress for a user
   */
  observeAllProgress(userId: string): Observable<UserEpisodeProgress[]> {
    return this.database
      .get<UserEpisodeProgress>('user_episode_progress')
      .query(Q.where('user_id', userId))
      .observe();
  }

  async saveProgress(
    userId: string,
    episodeId: string,
    position: number,
    duration: number
  ): Promise<UserEpisodeProgress> {

    // Sanity check: don't save if position > duration (indicates bad data)
    if (duration > 0 && position > duration * 1.1) { // Allow 10% buffer for rounding
      console.warn(`[ProgressRepository] Rejecting invalid progress: position (${position}) > duration (${duration}) for episode ${episodeId}`);
      // Return existing progress or throw
      const existing = await this.getProgress(userId, episodeId);
      if (existing) return existing;
      throw new Error('Invalid progress data: position exceeds duration');
    }

    const collection = this.database.get<UserEpisodeProgress>('user_episode_progress');

    // Check if progress exists
    const existing = await this.getProgress(userId, episodeId);

    if (existing) {
      // Update existing progress
      // Don't overwrite a valid duration with 0 - keep existing if new duration is invalid
      const effectiveDuration = duration > 0 ? duration : existing.totalDuration;

      // IMPORTANT: Don't overwrite real progress with 0!
      // This happens when periodic save fires before seek completes on track change
      if (position === 0 && existing.currentPosition > 10) {
        return existing;
      }

      // Keep completed flag sticky - once completed, stay completed (for "listen again" feature)
      const isNowComplete = effectiveDuration > 0 && position >= effectiveDuration * 0.95;
      const shouldBeCompleted = existing.completed || isNowComplete;

      const updated = await this.database.write(async function updateExistingProgress() {
        return await existing.update((progress) => {
          progress.currentPosition = position;
          progress.totalDuration = effectiveDuration;
          progress.lastPlayedAt = Date.now();
          progress.completed = shouldBeCompleted;
          progress.needsSync = true;
        });
      });

      // Track for batched sync (NEW) - use effective duration
      const key = `${userId}_${episodeId}`;
      this.pendingSyncs.set(key, { userId, episodeId, position, duration: effectiveDuration });

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

  /**
   * Clear progress for a specific episode (deletes local WatermelonDB record)
   * Useful for manually clearing corrupted data
   */
  async clearProgress(userId: string, episodeId: string): Promise<boolean> {
    try {
      const progress = await this.getProgress(userId, episodeId);
      if (progress) {
        await this.database.write(async () => {
          await progress.markAsDeleted();
        });
        console.log(`[ProgressRepository] Cleared progress for episode ${episodeId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ProgressRepository] Error clearing progress:', error);
      return false;
    }
  }

  /**
   * Clean up duplicate progress records (keep the one with highest position)
   * This fixes a bug where race conditions created multiple records per episode
   */
  async cleanupDuplicates(userId: string): Promise<number> {
    try {
      const allProgress = await this.database
        .get<UserEpisodeProgress>('user_episode_progress')
        .query(Q.where('user_id', userId))
        .fetch();

      // Group by episode ID
      const byEpisode = new Map<string, UserEpisodeProgress[]>();
      allProgress.forEach((p) => {
        const existing = byEpisode.get(p.episodeId) || [];
        existing.push(p);
        byEpisode.set(p.episodeId, existing);
      });

      let deletedCount = 0;

      // For each episode with duplicates, keep only the one with highest position
      for (const [episodeId, records] of byEpisode) {
        if (records.length <= 1) continue;

        // Sort by position descending (highest first)
        records.sort((a, b) => b.currentPosition - a.currentPosition);

        // Delete all except the first (highest position)
        const toDelete = records.slice(1);
        if (toDelete.length > 0) {
          console.log(`[ProgressRepo] Cleaning ${toDelete.length} duplicate(s) for episode ${episodeId.substring(0, 30)}`);
          await this.database.write(async () => {
            for (const record of toDelete) {
              await record.markAsDeleted();
              deletedCount++;
            }
          });
        }
      }

      if (deletedCount > 0) {
        console.log(`[ProgressRepo] Cleaned up ${deletedCount} duplicate progress record(s)`);
      }

      return deletedCount;
    } catch (error) {
      console.error('[ProgressRepo] Error cleaning duplicates:', error);
      return 0;
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

      // Get all local progress for this user
      const localProgress = await this.database
        .get<UserEpisodeProgress>('user_episode_progress')
        .query(Q.where('user_id', userId))
        .fetch();

      // If no remote progress, delete all local progress (it was deleted remotely)
      if (!remoteProgress || remoteProgress.length === 0) {
        if (localProgress.length > 0) {
          console.log(`No remote progress found, deleting ${localProgress.length} local record(s)`);
          await this.database.write(async () => {
            for (const local of localProgress) {
              await local.markAsDeleted();
            }
          });
        } else {
          console.log('No remote progress found for user');
        }
        return;
      }

      // Build set of remote episode IDs for quick lookup
      const remoteEpisodeIds = new Set(remoteProgress.map(r => r.episode_id));

      // Delete local records that don't exist remotely (were deleted)
      const localToDelete = localProgress.filter(l => !remoteEpisodeIds.has(l.episodeId));
      if (localToDelete.length > 0) {
        console.log(`Deleting ${localToDelete.length} local record(s) not found in remote`);
        await this.database.write(async () => {
          for (const local of localToDelete) {
            await local.markAsDeleted();
          }
        });
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
          console.log(`[ProgressRepo] OVERWRITING local with remote for ${remote.episode_id}: local pos ${local?.currentPosition || 0} -> remote pos ${remote.current_position}`);

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