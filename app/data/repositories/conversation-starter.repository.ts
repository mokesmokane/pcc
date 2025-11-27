import { getRandomValues } from 'expo-crypto';
import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type { Observable } from '@nozbe/watermelondb/utils/rx';
import { switchMap } from 'rxjs/operators';
import { BaseRepository } from './base.repository';
import type ConversationStarter from '../models/conversation-starter.model';
import type Comment from '../models/comment.model';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Polyfill crypto.getRandomValues for uuid library
if (typeof global.crypto !== 'object') {
  (global as any).crypto = {};
}
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = getRandomValues as any;
}

export interface StarterWithCommentCount {
  starter: ConversationStarter;
  commentCount: number;
}

export class ConversationStarterRepository extends BaseRepository<ConversationStarter> {
  private commentsCollection: any;
  private lastSyncTime = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(database: Database) {
    super(database, 'conversation_starters');
    this.commentsCollection = database.get('comments');
  }

  async upsertFromRemote(remoteData: any): Promise<ConversationStarter> {
    const existing = await this.findById(remoteData.id);

    const flatData = {
      episode_id: remoteData.episode_id,
      question: remoteData.question,
      order_position: remoteData.order_position,
      image_url: remoteData.image_url || null,
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

  // ===== READ OPERATIONS =====

  // Get all starters for an episode (one-time fetch)
  async getStartersForEpisode(episodeId: string): Promise<ConversationStarter[]> {
    return await this.query([
      Q.where('episode_id', episodeId),
      Q.sortBy('order_position', Q.asc),
    ]);
  }

  // REACTIVE: Observe all starters for an episode
  observeStartersForEpisode(episodeId: string): Observable<ConversationStarter[]> {
    return this.collection
      .query(
        Q.where('episode_id', episodeId),
        Q.sortBy('order_position', Q.asc)
      )
      .observe();
  }

  // Get starters with comment counts
  async getStartersWithCounts(episodeId: string): Promise<StarterWithCommentCount[]> {
    const starters = await this.getStartersForEpisode(episodeId);

    const startersWithCounts = await Promise.all(
      starters.map(async (starter) => {
        const commentCount = await this.commentsCollection
          .query(Q.where('starter_id', starter.id))
          .fetchCount();
        return { starter, commentCount };
      })
    );

    return startersWithCounts;
  }

  // REACTIVE: Observe starters with comment counts
  observeStartersWithCounts(episodeId: string): Observable<StarterWithCommentCount[]> {
    return this.observeStartersForEpisode(episodeId).pipe(
      switchMap(async (starters) => {
        const startersWithCounts = await Promise.all(
          starters.map(async (starter) => {
            const commentCount = await this.commentsCollection
              .query(Q.where('starter_id', starter.id))
              .fetchCount();
            return { starter, commentCount };
          })
        );
        return startersWithCounts;
      })
    );
  }

  // ===== COMMENT OPERATIONS =====

  // Get comments for a specific starter
  async getCommentsForStarter(starterId: string): Promise<Comment[]> {
    return await this.commentsCollection
      .query(
        Q.where('starter_id', starterId),
        Q.where('parent_id', null),
        Q.sortBy('created_at', Q.desc)
      )
      .fetch();
  }

  // REACTIVE: Observe comments for a starter
  observeCommentsForStarter(starterId: string): Observable<Comment[]> {
    return this.commentsCollection
      .query(
        Q.where('starter_id', starterId),
        Q.where('parent_id', null),
        Q.sortBy('created_at', Q.desc)
      )
      .observe();
  }

  // Add comment to a starter
  async addCommentToStarter(
    starterId: string,
    episodeId: string,
    userId: string,
    content: string
  ): Promise<Comment> {
    // Get user profile for denormalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    const commentId = uuidv4();
    const commentsCollection = this.commentsCollection;
    const database = this.database;

    const comment = await database.write(async function createStarterComment() {
      return await commentsCollection.create((record: any) => {
        record._raw.id = commentId;
        record._raw.episode_id = episodeId;
        record._raw.user_id = userId;
        record._raw.content = content;
        record._raw.starter_id = starterId;
        record._raw.parent_id = null;
        record._raw.username = profile?.username || null;
        record._raw.avatar_url = profile?.avatar_url || null;
        record._raw.created_at = Date.now();
        record._raw.updated_at = Date.now();
        record._raw.needs_sync = true;
      });
    });

    // Trigger background sync
    this.syncComment(commentId).catch(console.error);

    return comment;
  }

  // ===== SYNC OPERATIONS =====

  async syncFromRemote(episodeId: string, force = false): Promise<void> {
    const lastSync = this.lastSyncTime.get(episodeId) || 0;
    const cacheAge = Date.now() - lastSync;

    if (!force && cacheAge < this.CACHE_TTL) {
      console.log(`Starters cache valid for episode ${episodeId}, skipping sync`);
      return;
    }

    try {
      console.log(`Syncing conversation starters for episode ${episodeId}`);

      const { data: starters, error } = await supabase
        .from('conversation_starters')
        .select('*')
        .eq('episode_id', episodeId)
        .order('order_position');

      if (error) throw error;

      if (starters && starters.length > 0) {
        for (const starter of starters) {
          await this.upsertFromRemote(starter);
        }
      }

      // Also sync comments linked to starters
      await this.syncStarterCommentsFromRemote(episodeId);

      this.lastSyncTime.set(episodeId, Date.now());
      console.log(`Starters synced successfully for episode ${episodeId}`);
    } catch (error) {
      console.error('Failed to sync conversation starters:', error);
      throw error;
    }
  }

  private async syncStarterCommentsFromRemote(episodeId: string): Promise<void> {
    try {
      // Fetch comments without foreign key join (no FK relationship in Supabase)
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('episode_id', episodeId)
        .not('starter_id', 'is', null);

      if (error) throw error;

      if (comments && comments.length > 0) {
        // Get unique user IDs to fetch profiles
        const userIds = [...new Set(comments.map(c => c.user_id))];

        // Fetch profiles for all users in one query
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        // Create a map for quick lookup
        const profileMap = new Map(
          profiles?.map(p => [p.id, { username: p.username, avatar_url: p.avatar_url }]) || []
        );

        for (const comment of comments) {
          // Attach profile data to comment
          const profile = profileMap.get(comment.user_id);
          const commentWithProfile = {
            ...comment,
            profiles: profile || null,
          };
          await this.upsertCommentFromRemote(commentWithProfile);
        }
      }
    } catch (error) {
      console.error('Failed to sync starter comments:', error);
    }
  }

  private async upsertCommentFromRemote(remoteData: any): Promise<void> {
    const commentsCollection = this.commentsCollection;
    const database = this.database;

    await database.write(async function upsertStarterCommentFromRemote() {
      const existing = await commentsCollection
        .query(Q.where('id', remoteData.id))
        .fetch();

      if (existing.length > 0) {
        await existing[0].update((record: any) => {
          record.content = remoteData.content;
          record.starterId = remoteData.starter_id;
          record.username = remoteData.profiles?.username;
          record.avatarUrl = remoteData.profiles?.avatar_url;
          record.syncedAt = Date.now();
          record.needsSync = false;
        });
      } else {
        await commentsCollection.create((record: any) => {
          record._raw.id = remoteData.id;
          record._raw.episode_id = remoteData.episode_id;
          record._raw.user_id = remoteData.user_id;
          record._raw.content = remoteData.content;
          record._raw.starter_id = remoteData.starter_id;
          record._raw.parent_id = remoteData.parent_id || null;
          record._raw.username = remoteData.profiles?.username || null;
          record._raw.avatar_url = remoteData.profiles?.avatar_url || null;
          record._raw.created_at = new Date(remoteData.created_at).getTime();
          record._raw.updated_at = new Date(remoteData.updated_at).getTime();
          record._raw.synced_at = Date.now();
          record._raw.needs_sync = false;
        });
      }
    });
  }

  private async syncComment(commentId: string): Promise<void> {
    try {
      const comments = await this.commentsCollection
        .query(Q.where('id', commentId))
        .fetch();

      if (!comments || comments.length === 0) return;
      const comment = comments[0];

      if (!comment.needsSync) return;

      const { error } = await supabase
        .from('comments')
        .upsert({
          id: comment.id,
          episode_id: comment.episodeId,
          user_id: comment.userId,
          content: comment.content,
          starter_id: comment.starterId,
          parent_id: comment.parentId,
          created_at: new Date(comment.createdAt).toISOString(),
          updated_at: new Date(comment.updatedAt).toISOString(),
        });

      if (!error) {
        const database = this.database;
        await database.write(async function markStarterCommentSynced() {
          await comment.update((r: any) => {
            r.needsSync = false;
            r.syncedAt = Date.now();
          });
        });
      }
    } catch (error) {
      console.error('Failed to sync starter comment:', error);
    }
  }

  async pushLocalChanges(): Promise<void> {
    const needsSync = await this.query([Q.where('needs_sync', true)]);

    for (const starter of needsSync) {
      try {
        const { error } = await supabase.from('conversation_starters').upsert({
          id: starter.id,
          episode_id: starter.episodeId,
          question: starter.question,
          order_position: starter.orderPosition,
          image_url: starter.imageUrl,
          created_at: new Date(starter.createdAt).toISOString(),
          updated_at: new Date(starter.updatedAt).toISOString(),
        });

        if (!error) {
          await this.update(starter.id, {
            needsSync: false,
            syncedAt: Date.now(),
          } as any);
        }
      } catch (error) {
        console.error(`Failed to sync starter ${starter.id}:`, error);
      }
    }
  }

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
}

export const createConversationStarterRepository = (database: Database) => {
  return new ConversationStarterRepository(database);
};
