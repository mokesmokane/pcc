import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Member extends Model {
  static table = 'members';

  @field('user_id') userId!: string;
  @field('episode_id') episodeId!: string;
  @field('first_name') firstName?: string;
  @field('last_name') lastName?: string;
  @field('username') username?: string;
  @field('avatar_url') avatarUrl?: string;
  @field('progress') progress!: number;
  @field('has_finished') hasFinished!: boolean;
  @field('comment_count') commentCount!: number;
  @date('last_activity') lastActivity!: Date;

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;

  // Computed property for display name
  get displayName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.username || 'Anonymous';
  }

  // Helper to get relative time
  get lastActivityRelative(): string {
    const now = new Date();
    const diff = now.getTime() - this.lastActivity.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Online now';
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return 'Last week';
  }
}