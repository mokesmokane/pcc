import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class TranscriptSegment extends Model {
  static table = 'transcript_segments';

  @field('episode_id') episodeId!: string;
  @field('start_seconds') startSeconds!: number;
  @field('end_seconds') endSeconds!: number;
  @field('text') text!: string;
  @field('segment_index') segmentIndex!: number; // Order within the episode

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}