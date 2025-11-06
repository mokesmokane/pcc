import { getRandomValues } from 'expo-crypto';
import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';
import { BaseRepository } from './base.repository';
import type Comment from '../models/comment.model';
import type CommentReaction from '../models/comment-reaction.model';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Polyfill crypto.getRandomValues for uuid library
if (typeof global.crypto !== 'object') {
  (global as any).crypto = {};
}
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = getRandomValues as any;
}

export interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export class CommentRepository extends BaseRepository<Comment> {
  private reactionCollection: any;
  private lastSyncTime = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(database: Database) {
    super(database, 'comments');
    this.reactionCollection = database.get('comment_reactions');
  }

  async upsertFromRemote(remoteData: any): Promise<Comment> {
    const existing = await this.findById(remoteData.id);

    const flatData = {
      episode_id: remoteData.episode_id,
      user_id: remoteData.user_id,
      content: remoteData.content,
      parent_id: remoteData.parent_id || null,
      username: remoteData.username || remoteData.profiles?.username,
      avatar_url: remoteData.avatar_url || remoteData.profiles?.avatar_url,
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

  async getEpisodeComments(episodeId: string, parentId?: string): Promise<Comment[]> {
    const conditions = [
      Q.where('episode_id', episodeId),
      Q.sortBy('created_at', Q.desc),
    ];

    if (parentId === null) {
      conditions.push(Q.where('parent_id', null));
    } else if (parentId) {
      conditions.push(Q.where('parent_id', parentId));
    }

    return await this.query(conditions);
  }

  observeEpisodeComments(episodeId: string, parentId?: string): Observable<Comment[]> {
    const conditions = [
      Q.where('episode_id', episodeId),
      Q.sortBy('created_at', Q.desc),
    ];

    if (parentId === null) {
      conditions.push(Q.where('parent_id', null));
    } else if (parentId) {
      conditions.push(Q.where('parent_id', parentId));
    }

    return this.observeQuery(conditions);
  }

  async createComment(episodeId: string, userId: string, content: string, parentId?: string): Promise<Comment> {
    // Get user profile for denormalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    // Generate a proper UUID
    const uuid = uuidv4();

    const comment = await this.create({
      id: uuid,
      episode_id: episodeId,
      user_id: userId,
      content,
      parent_id: parentId,
      username: profile?.username,
      avatar_url: profile?.avatar_url,
      needs_sync: true,
    } as any);

    // Trigger background sync
    this.syncComment(comment.id).catch(console.error);

    return comment;
  }

  async toggleReaction(commentId: string, userId: string, emoji: string): Promise<boolean> {
    const reactionCollection = this.reactionCollection;
    const syncReaction = this.syncReaction.bind(this);

    return await this.database.write(async function toggleCommentReaction() {
      const existing = await reactionCollection
        .query(
          Q.where('comment_id', commentId),
          Q.where('user_id', userId),
          Q.where('emoji', emoji)
        )
        .fetch();

      if (existing.length > 0) {
        // Remove reaction - need to delete from Supabase
        const reactionToDelete = existing[0];

        // Delete from Supabase first
        try {
          const { error } = await supabase
            .from('comment_reactions')
            .delete()
            .eq('id', reactionToDelete.id);

          if (error) {
            console.error('toggleReaction - Failed to delete from Supabase:', error);
          }
        } catch (err) {
          console.error('toggleReaction - Error deleting reaction:', err);
        }

        // Then mark as deleted locally
        await reactionToDelete.markAsDeleted();
        return false;
      } else {
        // Add reaction with UUID
        const reactionId = uuidv4();
        const newReaction = await reactionCollection.create((reaction: any) => {
          reaction._raw.id = reactionId;
          reaction._raw.comment_id = commentId;
          reaction._raw.user_id = userId;
          reaction._raw.emoji = emoji;
          reaction._raw.created_at = Date.now();
          reaction._raw.needs_sync = true;
        });

        // Trigger sync in background
        console.log('toggleReaction - Triggering sync for reaction:', reactionId);
        syncReaction(reactionId).catch((err: Error) => {
          console.error('toggleReaction - Failed to sync reaction:', err);
        });

        return true;
      }
    });
  }

  async getReactionDetails(commentId: string): Promise<any[]> {
    console.log('getReactionDetails - Fetching for comment:', commentId);

    const reactions = await this.reactionCollection
      .query(Q.where('comment_id', commentId))
      .fetch();

    console.log('getReactionDetails - Found reactions:', reactions.length);

    if (reactions.length === 0) {
      console.log('getReactionDetails - No reactions found for comment');
      return [];
    }

    // Group by emoji with user details
    const reactionMap = new Map<string, any>();

    for (const reaction of reactions) {
      console.log('getReactionDetails - Processing reaction:', {
        emoji: reaction.emoji,
        userId: reaction.userId,
        id: reaction.id
      });

      if (!reactionMap.has(reaction.emoji)) {
        reactionMap.set(reaction.emoji, {
          emoji: reaction.emoji,
          users: [],
        });
      }

      // Get user profile for this reaction
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', reaction.userId)
        .single();

      if (error) {
        console.error('getReactionDetails - Error fetching profile:', error);
      }

      const userInfo = {
        id: reaction.userId,
        username: profile?.username || 'Anonymous',
        avatar: profile?.avatar_url,
      };
      console.log('getReactionDetails - Adding user:', userInfo);
      reactionMap.get(reaction.emoji).users.push(userInfo);
    }

    const result = Array.from(reactionMap.values());
    console.log('getReactionDetails - Returning:', JSON.stringify(result));
    return result;
  }

  async getReactions(commentId: string, currentUserId?: string): Promise<Reaction[]> {
    const reactions = await this.reactionCollection
      .query(Q.where('comment_id', commentId))
      .fetch();

    const summary = new Map<string, Reaction>();

    reactions.forEach((r: CommentReaction) => {
      const {emoji} = r;
      if (!summary.has(emoji)) {
        summary.set(emoji, {
          emoji,
          count: 0,
          userReacted: false,
        });
      }
      const reaction = summary.get(emoji)!;
      reaction.count++;
      if (currentUserId && r.userId === currentUserId) {
        reaction.userReacted = true;
      }
    });

    return Array.from(summary.values());
  }

  observeReactions(commentId: string, currentUserId?: string): Observable<Reaction[]> {
    return new Observable(observer => {
      const subscription = this.reactionCollection
        .query(Q.where('comment_id', commentId))
        .observe()
        .subscribe(async (reactions: CommentReaction[]) => {
          const summary = new Map<string, Reaction>();

          reactions.forEach((r: CommentReaction) => {
            const {emoji} = r;
            if (!summary.has(emoji)) {
              summary.set(emoji, {
                emoji,
                count: 0,
                userReacted: false,
              });
            }
            const reaction = summary.get(emoji)!;
            reaction.count++;
            if (currentUserId && r.userId === currentUserId) {
              reaction.userReacted = true;
            }
          });

          observer.next(Array.from(summary.values()));
        });

      return () => subscription.unsubscribe();
    });
  }

  observeAllReactionsForEpisode(episodeId: string): Observable<CommentReaction[]> {
    return new Observable(observer => {
      let reactionsSubscription: any = null;

      // First get all comments for this episode
      const subscription = this.collection
        .query(Q.where('episode_id', episodeId))
        .observe()
        .subscribe(async (comments) => {
          // Clean up previous reactions subscription if it exists
          if (reactionsSubscription) {
            reactionsSubscription.unsubscribe();
          }

          if (comments.length === 0) {
            observer.next([]);
            return;
          }

          // Get all comment IDs
          const commentIds = comments.map(c => c.id);

          // Now observe all reactions for these comments
          reactionsSubscription = this.reactionCollection
            .query(Q.where('comment_id', Q.oneOf(commentIds)))
            .observe()
            .subscribe((reactions: CommentReaction[]) => {
              observer.next(reactions);
            });
        });

      return () => {
        subscription.unsubscribe();
        if (reactionsSubscription) {
          reactionsSubscription.unsubscribe();
        }
      };
    });
  }

  async syncWithRemote(episodeId: string, force = false): Promise<void> {
    // Check cache age
    const lastSync = this.lastSyncTime.get(episodeId) || 0;
    const cacheAge = Date.now() - lastSync;

    if (!force && cacheAge < this.CACHE_TTL) {
      console.log(`✅ Comments cache valid for episode ${episodeId}, skipping sync`);
      return;
    }

    try {
      console.log(`📥 Syncing comments for episode ${episodeId} (cache age: ${Math.round(cacheAge / 1000)}s)`);

      // Fetch comments from Supabase
      const { data: comments, error } = await supabase
        .rpc('get_episode_comments', {
          p_episode_id: episodeId,
        });

      if (error) throw error;

      if (comments && comments.length > 0) {
        for (const comment of comments) {
          await this.upsertFromRemote(comment);

          // Sync reactions for this comment
          if (comment.reactions && Array.isArray(comment.reactions)) {
            await this.syncReactionsFromRemote(comment.id, comment.reactions);
          }
        }
      }

      // Also sync reactions separately
      if (comments && comments.length > 0) {
        const commentIds = comments.map((c: any) => c.id);
        console.log('syncWithRemote - Fetching reactions for comments:', commentIds);

        const { data: reactions, error: reactionsError } = await supabase
          .from('comment_reactions')
          .select('*')
          .in('comment_id', commentIds);

        if (reactionsError) {
          console.error('syncWithRemote - Error fetching reactions:', reactionsError);
        } else if (reactions) {
          console.log('syncWithRemote - Found reactions:', reactions.length);
          for (const reaction of reactions) {
            try {
              await this.upsertReactionFromRemote(reaction);
            } catch (err) {
              console.warn('Failed to upsert reaction, possibly duplicate:', err);
            }
          }
        }
      }

      // Update cache timestamp after successful sync
      this.lastSyncTime.set(episodeId, Date.now());
      console.log(`✅ Comments synced successfully for episode ${episodeId}`);
    } catch (error) {
      console.error('Failed to sync comments:', error);
      throw error;
    }
  }

  private async syncReactionsFromRemote(commentId: string, reactions: any[]): Promise<void> {
    // This would sync the reactions summary - implementation depends on the data format
    // For now, we'll rely on the separate reaction sync
  }

  private async upsertReactionFromRemote(remoteData: any): Promise<void> {
    const reactionCollection = this.reactionCollection;

    await this.database.write(async function upsertReactionFromSupabase() {
      // First check if a reaction with this ID already exists
      const existingById = await reactionCollection
        .query(Q.where('id', remoteData.id))
        .fetch();

      if (existingById.length > 0) {
        // Update existing reaction
        await existingById[0].update((reaction: any) => {
          reaction.emoji = remoteData.emoji;
          reaction.syncedAt = Date.now();
          reaction.needsSync = false;
        });
        return;
      }

      // Check if this user already has a reaction for this comment/emoji combo
      const existing = await reactionCollection
        .query(
          Q.where('comment_id', remoteData.comment_id),
          Q.where('user_id', remoteData.user_id),
          Q.where('emoji', remoteData.emoji)
        )
        .fetch();

      if (existing.length === 0) {
        await reactionCollection.create((reaction: any) => {
          reaction._raw.id = remoteData.id;
          reaction._raw.comment_id = remoteData.comment_id;
          reaction._raw.user_id = remoteData.user_id;
          reaction._raw.emoji = remoteData.emoji;
          reaction._raw.created_at = new Date(remoteData.created_at).getTime();
          reaction._raw.synced_at = Date.now();
          reaction._raw.needs_sync = false;
        });
      } else {
        // Update the existing reaction with the remote ID
        await existing[0].update((reaction: any) => {
          reaction.id = remoteData.id;
          reaction.syncedAt = Date.now();
          reaction.needsSync = false;
        });
      }
    });
  }

  async syncReaction(reactionId: string): Promise<void> {
    try {
      const reaction = await this.reactionCollection
        .query(Q.where('id', reactionId))
        .fetch();

      if (!reaction || reaction.length === 0) return;
      const reactionData = reaction[0];

      if (!reactionData.needsSync) return;

      console.log('syncReaction - Syncing to Supabase:', {
        id: reactionData.id,
        comment_id: reactionData.commentId,
        user_id: reactionData.userId,
        emoji: reactionData.emoji,
      });

      const { data, error } = await supabase
        .from('comment_reactions')
        .upsert({
          id: reactionData.id,
          comment_id: reactionData.commentId,
          user_id: reactionData.userId,
          emoji: reactionData.emoji,
          created_at: new Date(reactionData.createdAt).toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('syncReaction - Supabase error:', error);
        throw error;
      }
      if (data) {
        await this.database.write(async function markReactionAsSynced() {
          await reactionData.update((r: any) => {
            r.needsSync = false;
            r.syncedAt = Date.now();
          });
        });
        console.log('syncReaction - Reaction marked as synced');
      }
    } catch (error) {
      console.error('Failed to sync reaction - Full error:', error);
    }
  }

  async syncComment(commentId: string): Promise<void> {
    try {
      const comment = await this.findById(commentId);
      console.log('syncComment - Found comment:', comment);
      if (!comment || !comment.needsSync) {
        console.log('syncComment - Skipping, needsSync:', comment?.needsSync);
        return;
      }

      console.log('syncComment - Syncing to Supabase:', {
        id: comment.id,
        episode_id: comment.episodeId,
        user_id: comment.userId,
        content: comment.content,
      });

      const { data, error } = await supabase
        .from('comments')
        .upsert({
          id: comment.id,
          episode_id: comment.episodeId,
          user_id: comment.userId,
          content: comment.content,
          parent_id: comment.parentId,
          created_at: new Date(comment.createdAt).toISOString(),
          updated_at: new Date(comment.updatedAt).toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('syncComment - Supabase error:', error);
        throw error;
      }

      if (data) {
        await this.update(comment.id, {
          needsSync: false,
          syncedAt: Date.now(),
        } as any);
        console.log('syncComment - Comment marked as synced');
      }
    } catch (error) {
      console.error('Failed to sync comment - Full error:', error);
    }
  }

  async pushLocalChanges(): Promise<void> {
    // Sync comments
    const needsSyncComments = await this.query([Q.where('needs_sync', true)]);

    for (const comment of needsSyncComments) {
      await this.syncComment(comment.id);
    }

    // Sync reactions
    const needsSyncReactions = await this.reactionCollection
      .query(Q.where('needs_sync', true))
      .fetch();

    for (const reaction of needsSyncReactions) {
      await this.syncReaction(reaction.id);
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
}

export const createCommentRepository = (database: Database) => {
  return new CommentRepository(database);
};