import database from '../db';
import { Q } from '@nozbe/watermelondb';

export class DebugService {
  static async checkReactionSyncStatus() {
    try {
      const reactionCollection = database.collections.get('comment_reactions');

      // Get all reactions
      const allReactions = await reactionCollection.query().fetch();

      console.log('=== REACTION SYNC STATUS ===');
      console.log('Total reactions in local DB:', allReactions.length);

      // Check needs_sync status
      const needsSync = await reactionCollection
        .query(Q.where('needs_sync', true))
        .fetch();

      console.log('Reactions needing sync:', needsSync.length);

      // Log each reaction's status
      for (const reaction of allReactions) {
        console.log({
          id: reaction.id,
          emoji: reaction.emoji,
          comment_id: reaction.commentId,
          user_id: reaction.userId,
          needs_sync: reaction.needsSync,
          synced_at: reaction.syncedAt,
          created_at: reaction.createdAt,
        });
      }

      // Check for reactions that should be deleted
      const syncedReactions = await reactionCollection
        .query(Q.where('needs_sync', false))
        .fetch();

      console.log('Reactions already synced:', syncedReactions.length);

      return {
        total: allReactions.length,
        needsSync: needsSync.length,
        synced: syncedReactions.length,
        reactions: allReactions.map(r => ({
          id: r.id,
          emoji: r.emoji,
          needs_sync: r.needsSync,
        }))
      };
    } catch (error) {
      console.error('Failed to check reaction sync status:', error);
      return null;
    }
  }

  static async forceSyncReactions() {
    try {
      const { CommentRepository } = require('../data/repositories/comment.repository');
      const repo = new CommentRepository(database);

      console.log('=== FORCING REACTION SYNC ===');

      // Get all reactions needing sync
      const reactionCollection = database.collections.get('comment_reactions');
      const needsSync = await reactionCollection
        .query(Q.where('needs_sync', true))
        .fetch();

      console.log(`Found ${needsSync.length} reactions needing sync`);

      // Get all comments needing sync
      const commentCollection = database.collections.get('comments');
      const commentsNeedSync = await commentCollection
        .query(Q.where('needs_sync', true))
        .fetch();

      console.log(`Found ${commentsNeedSync.length} comments needing sync`);

      // Push all changes
      await repo.pushLocalChanges();
      console.log('Push complete');

      // Verify sync status
      const stillNeedSync = await reactionCollection
        .query(Q.where('needs_sync', true))
        .fetch();

      console.log(`Reactions still needing sync: ${stillNeedSync.length}`);

      if (stillNeedSync.length > 0) {
        console.log('Failed to sync reactions:', stillNeedSync.map(r => ({
          id: r.id,
          emoji: r.emoji,
          comment_id: r.commentId,
        })));
      }

      return true;
    } catch (error) {
      console.error('Failed to force sync:', error);
      return false;
    }
  }

  static async cleanupInvalidRecords() {
    try {
      const commentCollection = database.collections.get('comments');
      const reactionCollection = database.collections.get('comment_reactions');

      // UUID validation regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      console.log('=== CLEANING INVALID RECORDS ===');

      // Clean comments with invalid IDs
      const allComments = await commentCollection.query().fetch();
      let deletedComments = 0;

      for (const comment of allComments) {
        if (!uuidRegex.test(comment.id)) {
          console.log('Deleting comment with invalid ID:', comment.id);
          await database.write(async function deleteInvalidComment() {
            await comment.markAsDeleted();
          });
          deletedComments++;
        }
      }

      // Clean reactions with invalid IDs
      const allReactions = await reactionCollection.query().fetch();
      let deletedReactions = 0;

      for (const reaction of allReactions) {
        if (!uuidRegex.test(reaction.id)) {
          console.log('Deleting reaction with invalid ID:', reaction.id);
          await database.write(async function deleteInvalidReaction() {
            await reaction.markAsDeleted();
          });
          deletedReactions++;
        }
      }

      console.log(`Deleted ${deletedComments} comments and ${deletedReactions} reactions with invalid IDs`);
      return { deletedComments, deletedReactions };
    } catch (error) {
      console.error('Failed to cleanup invalid records:', error);
      return null;
    }
  }

  static async cleanupLocalReactions() {
    try {
      const { supabase } = require('../lib/supabase');
      const reactionCollection = database.collections.get('comment_reactions');

      // Get all synced reactions
      const syncedReactions = await reactionCollection
        .query(Q.where('needs_sync', false))
        .fetch();

      console.log('=== CHECKING SYNCED REACTIONS ===');
      console.log('Found', syncedReactions.length, 'synced reactions');

      for (const reaction of syncedReactions) {
        // Check if it still exists in Supabase
        const { data, error } = await supabase
          .from('comment_reactions')
          .select('id')
          .eq('id', reaction.id)
          .single();

        if (error?.code === 'PGRST116' || !data) {
          // Reaction doesn't exist in Supabase, delete locally
          console.log('Deleting local reaction that no longer exists in Supabase:', reaction.id);
          await database.write(async function deleteOrphanedLocalReaction() {
            await reaction.markAsDeleted();
          });
        }
      }

      console.log('Cleanup complete');
      return true;
    } catch (error) {
      console.error('Failed to cleanup reactions:', error);
      return false;
    }
  }
}

// Export for use in console
if (typeof global !== 'undefined') {
  (global as any).DebugService = DebugService;
}