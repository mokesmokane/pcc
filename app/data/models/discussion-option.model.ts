import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class DiscussionOption extends Model {
  static table = 'discussion_options';

  @field('question_id') questionId!: string;
  @field('value') value!: number;
  @field('label') label!: string;
  @field('emoji') emoji?: string;
  @field('image_url') imageUrl?: string;
  @field('order_position') orderPosition!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}
