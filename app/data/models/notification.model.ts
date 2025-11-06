import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class Notification extends Model {
  static table = 'notifications';

  @field('user_id') userId!: string;
  @field('type') type!: string; // 'friend_joined', 'comment_reply', 'meetup_update', etc.
  @field('title') title!: string;
  @field('message') message!: string;
  @field('is_read') isRead!: boolean;
  @field('related_user_id') relatedUserId?: string; // ID of user who triggered the notification
  @field('related_entity_id') relatedEntityId?: string; // ID of episode, comment, meetup, etc.
  @field('related_entity_type') relatedEntityType?: string; // 'episode', 'comment', 'meetup', etc.
  @field('action_url') actionUrl?: string; // Deep link to navigate to
  @field('metadata') metadata?: string; // JSON string for additional data

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;
}
