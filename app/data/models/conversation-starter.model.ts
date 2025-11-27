import { Model } from '@nozbe/watermelondb';
import { children, date, field, lazy, readonly } from '@nozbe/watermelondb/decorators';
import { Q } from '@nozbe/watermelondb';

export default class ConversationStarter extends Model {
  static table = 'conversation_starters';
  static associations = {
    comments: { type: 'has_many', foreignKey: 'starter_id' },
  };

  @field('episode_id') episodeId!: string;
  @field('question') question!: string;
  @field('order_position') orderPosition!: number;
  @field('image_url') imageUrl?: string;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;

  // Relations
  @children('comments') comments!: any;

  // Computed: Count of comments for this starter
  @lazy commentCount = this.collections
    .get('comments')
    .query(Q.where('starter_id', this.id))
    .fetchCount();
}
