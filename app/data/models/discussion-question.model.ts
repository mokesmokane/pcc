import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class DiscussionQuestion extends Model {
  static table = 'discussion_questions';

  @field('episode_id') episodeId!: string;
  @field('question') question!: string;
  @field('question_type') questionType!: string;
  @field('order_position') orderPosition!: number;
  @field('image_url') imageUrl?: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}
