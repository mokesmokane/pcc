import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { NotificationService } from '../services/notification.service';
import Notification from '../data/models/notification.model';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  loadNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationService, setNotificationService] = useState<NotificationService | null>(null);

  const { user } = useAuth();
  const { database } = useDatabase();

  // Initialize service
  useEffect(() => {
    if (database) {
      setNotificationService(new NotificationService(database));
    }
  }, [database]);

  const loadNotifications = useCallback(async () => {
    if (!user || !notificationService) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Sync from Supabase first
      await notificationService.syncNotifications(user.id);

      // Get from local database
      const notifs = await notificationService.getNotifications(user.id, 50);
      const count = await notificationService.getUnreadCount(user.id);

      setNotifications(notifs);
      setUnreadCount(count);

      console.log('NotificationsContext: Loaded notifications:', notifs.length, 'Unread:', count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, notificationService]);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!notificationService) return;

    try {
      await notificationService.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } as Notification : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [notificationService]);

  const markAllAsRead = useCallback(async () => {
    if (!user || !notificationService) return;

    try {
      await notificationService.markAllAsRead(user.id);

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true } as Notification))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [user, notificationService]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!notificationService) return;

    try {
      await notificationService.deleteNotification(notificationId);

      // Update local state
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [notificationService, notifications]);

  // Load notifications and subscribe to changes when user logs in
  useEffect(() => {
    if (!user || !notificationService) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Initial sync from Supabase
    notificationService.syncNotifications(user.id).catch((error) => {
      console.error('Failed to sync notifications:', error);
    });

    // Subscribe to Realtime broadcasts
    notificationService.subscribeToNotifications(user.id, () => {
      console.log('Notification update triggered via broadcast');
    }).catch((error) => {
      console.error('Failed to subscribe to notifications:', error);
    });

    // Subscribe to WatermelonDB changes (reactive)
    console.log('📱 Setting up WatermelonDB observables for notifications...');

    const notificationsSubscription = notificationService.observeNotifications(user.id)
      .subscribe((notifs) => {
        console.log('📱 WatermelonDB OBSERVABLE FIRED - Notifications:', notifs.length);
        setNotifications(notifs);
      });

    const unreadCountSubscription = notificationService.observeUnreadCount(user.id)
      .subscribe((count) => {
        console.log('📱 WatermelonDB OBSERVABLE FIRED - Unread count:', count);
        setUnreadCount(count);
      });

    console.log('📱 WatermelonDB observables subscribed');

    return () => {
      notificationsSubscription.unsubscribe();
      unreadCountSubscription.unsubscribe();
      notificationService.unsubscribe();
    };
  }, [user, notificationService]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        loadNotifications,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
