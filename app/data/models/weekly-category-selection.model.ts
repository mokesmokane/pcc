import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class WeeklyCategorySelection extends Model {
  static table = 'weekly_category_selections';

  @field('week_start') weekStart!: string;
  @field('category') category!: string;
  @field('episode_id') episodeId!: string;

  // Denormalized episode data
  @field('episode_title') episodeTitle!: string;
  @field('podcast_title') podcastTitle!: string;
  @field('episode_description') episodeDescription!: string;
  @field('audio_url') audioUrl!: string;
  @field('artwork_url') artworkUrl?: string;
  @field('duration') duration!: number;
  @field('published_at') publishedAt!: string;

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}
