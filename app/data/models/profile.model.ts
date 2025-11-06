import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class Profile extends Model {
  static table = 'profiles';

  @field('user_id') userId!: string;
  @field('username') username?: string;
  @field('avatar_url') avatarUrl?: string;
  @field('first_name') firstName?: string;
  @field('last_name') lastName?: string;

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}