import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class UserEpisodeProgress extends Model {
  static table = 'user_episode_progress';

  @field('user_id') userId!: string;
  @field('episode_id') episodeId!: string;
  @field('current_position') currentPosition!: number;
  @field('total_duration') totalDuration!: number;
  @field('completed') completed!: boolean;
  @field('last_played_at') lastPlayedAt!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;
  @field('needs_sync') needsSync!: boolean;
}