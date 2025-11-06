import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class EpisodeDetails extends Model {
  static table = 'episode_details';

  @field('episode_id') episodeId!: string;
  @field('about') about!: string;
  @field('why_we_love_it') whyWeLoveIt!: string;

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}