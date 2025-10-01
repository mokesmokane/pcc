import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class WeeklySelection extends Model {
  static table = 'weekly_selections';

  @field('week_start') weekStart!: string;
  @field('episode_id') episodeId!: string;
  @field('order_position') orderPosition!: number;

  // Denormalized episode data
  @field('episode_title') episodeTitle!: string;
  @field('podcast_title') podcastTitle!: string;
  @field('episode_description') episodeDescription!: string;
  @field('audio_url') audioUrl!: string;
  @field('artwork_url') artworkUrl?: string;
  @field('duration') duration!: number;
  @field('category') category!: string;
  @field('published_at') publishedAt!: string;

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}