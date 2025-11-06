import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class CommentReaction extends Model {
  static table = 'comment_reactions';
  static associations = {
    comments: { type: 'belongs_to', key: 'comment_id' },
  };

  @field('comment_id') commentId!: string;
  @field('user_id') userId!: string;
  @field('emoji') emoji!: string;

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}