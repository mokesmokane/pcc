import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class UserDiscussionResponse extends Model {
  static table = 'user_discussion_responses';

  @field('user_id') userId!: string;
  @field('question_id') questionId!: string;
  @field('option_value') optionValue!: number;
  @field('response_type') responseType!: string; // 'agree' or 'disagree'
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}
