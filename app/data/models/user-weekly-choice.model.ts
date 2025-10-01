import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class UserWeeklyChoice extends Model {
  static table = 'user_weekly_choices';

  @field('user_id') userId!: string;
  @field('episode_id') episodeId!: string;
  @field('week_start') weekStart!: string;
  @date('chosen_at') chosenAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}