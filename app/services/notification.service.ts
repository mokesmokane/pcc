import { Database } from '@nozbe/watermelondb';
import { NotificationRepository } from '../data/repositories/notification.repository';
import { supabase } from '../lib/supabase';
import Notification from '../data/models/notification.model';

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  relatedUserId?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private repository: NotificationRepository;
  private syncSubscription: any = null;

  constructor(database: Database) {
    this.repository = new NotificationRepository(database);
  }

  /**
   * Get all notifications for a user
   */
  async getNotifications(userId: string, limit?: number): Promise<Notification[]> {
    return await this.repository.findByUserId(userId, limit);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.repository.findUnreadCount(userId);
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await this.repository.findUnreadByUserId(userId);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = await this.repository.markAsRead(notificationId);

    // Sync to Supabase
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error syncing notification read status:', error);
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.repository.markAllAsRead(userId);

    // Sync to Supabase
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error syncing mark all as read:', error);
    }
  }

  /**
   * Sync notifications from Supabase
   */
  async syncNotifications(userId: string): Promise<void> {
    try {
      console.log('Syncing notifications for user:', userId);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching notifications from Supabase:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log(`Syncing ${data.length} notifications from Supabase`);

        for (const notification of data) {
          await this.repository.upsertFromRemote(notification);
        }
      }
    } catch (error) {
      console.error('Error in syncNotifications:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time notification updates using Broadcast (scalable method)
   */
  async subscribeToNotifications(userId: string, onUpdate: () => void): Promise<void> {
    // Unsubscribe from previous subscription if exists
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }

    // Set auth for broadcast authorization
    await supabase.realtime.setAuth();

    // Subscribe to user-specific broadcast channel
    this.syncSubscription = supabase
      .channel(`notifications:${userId}`, {
        config: { private: true }, // Required for Broadcast authorization
      })
      .on('broadcast', { event: 'INSERT' }, async (payload) => {
        console.log('🔔 New notification broadcast:', payload);
        const newRecord = payload.payload?.record;

        if (newRecord) {
          console.log('🔔 Upserting notification:', newRecord.id);
          await this.repository.upsertFromRemote(newRecord);
          console.log('✅ Notification upserted successfully');
          onUpdate();
        } else {
          console.error('❌ No record found in broadcast payload!');
        }
      })
      .on('broadcast', { event: 'UPDATE' }, async (payload) => {
        console.log('🔔 Updated notification broadcast:', payload);
        const newRecord = payload.payload?.record;

        if (newRecord) {
          await this.repository.upsertFromRemote(newRecord);
          onUpdate();
        }
      })
      .on('broadcast', { event: 'DELETE' }, async (payload) => {
        console.log('🔔 Deleted notification broadcast:', payload);
        const oldRecord = payload.payload?.old_record;

        if (oldRecord) {
          await this.repository.delete(oldRecord.id);
          onUpdate();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to notification broadcasts for user:', userId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to notification broadcasts');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Notification broadcast subscription timed out');
        }
      });
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(): void {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
      this.syncSubscription = null;
      console.log('Unsubscribed from notification updates');
    }
  }

  /**
   * Observe notifications (reactive)
   */
  observeNotifications(userId: string) {
    return this.repository.observeByUserId(userId);
  }

  /**
   * Observe unread count (reactive)
   */
  observeUnreadCount(userId: string) {
    return this.repository.observeUnreadCount(userId);
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await this.repository.delete(notificationId);

    // Delete from Supabase
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error deleting notification from Supabase:', error);
    }
  }
}
