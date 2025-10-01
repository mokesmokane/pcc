import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children, lazy } from '@nozbe/watermelondb/decorators';
import { Q } from '@nozbe/watermelondb';

export default class Comment extends Model {
  static table = 'comments';
  static associations = {
    comment_reactions: { type: 'has_many', foreignKey: 'comment_id' },
    comments: { type: 'has_many', foreignKey: 'parent_id' }, // for replies
  };

  @field('episode_id') episodeId!: string;
  @field('user_id') userId!: string;
  @field('content') content!: string;
  @field('parent_id') parentId?: string;

  // Denormalized user data
  @field('username') username?: string;
  @field('avatar_url') avatarUrl?: string;

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;

  // Relations
  @children('comments') replies!: any;
  @children('comment_reactions') reactions!: any;

  // Computed properties
  @lazy replyCount = this.collections
    .get('comments')
    .query(Q.where('parent_id', this.id))
    .fetchCount();

  @lazy reactionsSummary = this.collections
    .get('comment_reactions')
    .query(Q.where('comment_id', this.id))
    .fetch()
    .then(reactions => {
      const summary = new Map();
      reactions.forEach((r: any) => {
        const emoji = r.emoji;
        if (!summary.has(emoji)) {
          summary.set(emoji, { emoji, count: 0, userIds: [] });
        }
        summary.get(emoji).count++;
        summary.get(emoji).userIds.push(r.userId);
      });
      return Array.from(summary.values());
    });
}