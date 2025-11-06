import { Database, Q } from '@nozbe/watermelondb';
import { BaseRepository } from './base.repository';
import Notification from '../models/notification.model';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor(database: Database) {
    super(database, 'notifications');
  }

  async findUnreadCount(userId: string): Promise<number> {
    const notifications = await this.collection
      .query(
        Q.where('user_id', userId),
        Q.where('is_read', false)
      )
      .fetchCount();
    return notifications;
  }

  async findByUserId(userId: string, limit?: number): Promise<Notification[]> {
    const queryConditions = [
      Q.where('user_id', userId),
      Q.sortBy('created_at', Q.desc)
    ];

    if (limit) {
      queryConditions.push(Q.take(limit));
    }

    return await this.collection
      .query(...queryConditions)
      .fetch();
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    return await this.collection
      .query(
        Q.where('user_id', userId),
        Q.where('is_read', false),
        Q.sortBy('created_at', Q.desc)
      )
      .fetch();
  }

  observeByUserId(userId: string) {
    return this.collection
      .query(
        Q.where('user_id', userId),
        Q.sortBy('created_at', Q.desc)
      )
      .observe();
  }

  observeUnreadCount(userId: string) {
    return this.collection
      .query(
        Q.where('user_id', userId),
        Q.where('is_read', false)
      )
      .observeCount();
  }

  async markAsRead(id: string): Promise<Notification> {
    return await this.update(id, { isRead: true } as Partial<Notification>);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const unreadNotifications = await this.findUnreadByUserId(userId);

    await this.database.write(async function markAllUserNotificationsAsRead() {
      await Promise.all(
        unreadNotifications.map(notification =>
          notification.update((n: any) => {
            n.isRead = true;
            n.updatedAt = new Date();
          })
        )
      );
    });
  }

  async upsertFromRemote(remoteData: any): Promise<Notification> {
    try {
      const existing = await this.findById(remoteData.id);
      const collection = this.collection;

      if (existing) {
        return await this.database.write(async function updateNotificationFromRemote() {
          return await existing.update((record: any) => {
            record.userId = remoteData.user_id;
            record.type = remoteData.type;
            record.title = remoteData.title;
            record.message = remoteData.message;
            record.isRead = remoteData.is_read || false;
            record.relatedUserId = remoteData.related_user_id;
            record.relatedEntityId = remoteData.related_entity_id;
            record.relatedEntityType = remoteData.related_entity_type;
            record.actionUrl = remoteData.action_url;
            record.metadata = remoteData.metadata ? JSON.stringify(remoteData.metadata) : null;
            record.syncedAt = Date.now();
            record.needsSync = false;
            record.updatedAt = new Date(remoteData.updated_at || Date.now());
          });
        });
      } else {
        return await this.database.write(async function createNotificationFromRemote() {
          return await collection.create((record: any) => {
            record._raw.id = remoteData.id;
            record.userId = remoteData.user_id;
            record.type = remoteData.type;
            record.title = remoteData.title;
            record.message = remoteData.message;
            record.isRead = remoteData.is_read || false;
            record.relatedUserId = remoteData.related_user_id;
            record.relatedEntityId = remoteData.related_entity_id;
            record.relatedEntityType = remoteData.related_entity_type;
            record.actionUrl = remoteData.action_url;
            record.metadata = remoteData.metadata ? JSON.stringify(remoteData.metadata) : null;
            record.syncedAt = Date.now();
            record.needsSync = false;
            // Set readonly fields via _raw
            record._raw.created_at = new Date(remoteData.created_at || Date.now()).getTime();
            record.updatedAt = new Date(remoteData.updated_at || Date.now());
          });
        });
      }
    } catch (error) {
      console.error('Error upserting notification from remote:', error);
      throw error;
    }
  }

  async markForSync(id: string): Promise<void> {
    const collection = this.collection;
    await this.database.write(async function markNotificationForSync() {
      const notification = await collection.find(id);
      await notification.update((n: any) => {
        n.needsSync = true;
      });
    });
  }

  protected prepareCreate(data: Partial<Notification>): any {
    return {
      user_id: (data as any).userId,
      type: (data as any).type,
      title: (data as any).title,
      message: (data as any).message,
      is_read: (data as any).isRead || false,
      related_user_id: (data as any).relatedUserId || null,
      related_entity_id: (data as any).relatedEntityId || null,
      related_entity_type: (data as any).relatedEntityType || null,
      action_url: (data as any).actionUrl || null,
      metadata: (data as any).metadata || null,
      created_at: Date.now(),
      updated_at: Date.now(),
      synced_at: null,
      needs_sync: true,
    };
  }

  protected prepareUpdate(data: Partial<Notification>): any {
    const update: any = {
      updated_at: Date.now(),
    };

    if ((data as any).isRead !== undefined) update.is_read = (data as any).isRead;
    if ((data as any).type) update.type = (data as any).type;
    if ((data as any).title) update.title = (data as any).title;
    if ((data as any).message) update.message = (data as any).message;

    return update;
  }
}
