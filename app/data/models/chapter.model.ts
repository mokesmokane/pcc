import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class Chapter extends Model {
  static table = 'chapters';

  @field('episode_id') episodeId!: string;
  @field('title') title!: string;
  @field('description') description?: string;
  @field('start_seconds') startSeconds!: number;
  @field('end_seconds') endSeconds?: number;

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}