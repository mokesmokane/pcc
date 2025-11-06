import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../contexts/NotificationsContext';
import Notification from '../data/models/notification.model';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [profileCache, setProfileCache] = useState<Record<string, { firstName: string; lastName: string; avatarUrl?: string }>>({});

  // Fetch profiles for all related users
  useEffect(() => {
    const fetchProfiles = async () => {
      const relatedUserIds = notifications
        .filter(n => n.relatedUserId)
        .map(n => n.relatedUserId!)
        .filter(id => !profileCache[id]); // Only fetch if not cached

      console.log('NotificationsModal: Related user IDs to fetch:', relatedUserIds);

      if (relatedUserIds.length === 0) {
        console.log('NotificationsModal: No new profiles to fetch');
        return;
      }

      try {
        console.log('NotificationsModal: Fetching profiles from Supabase...');
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', relatedUserIds);

        if (error) {
          console.error('Error fetching profiles:', error);
          return;
        }

        if (data) {
          console.log('NotificationsModal: Fetched profiles:', data);
          const newCache = { ...profileCache };
          data.forEach(profile => {
            newCache[profile.id] = {
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              avatarUrl: profile.avatar_url || undefined,
            };
          });
          setProfileCache(newCache);
          console.log('NotificationsModal: Updated profile cache:', newCache);
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
      }
    };

    if (visible && notifications.length > 0) {
      fetchProfiles();
    }
  }, [notifications, visible]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // TODO: Handle navigation based on actionUrl or relatedEntityType
    // For now, just mark as read
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const getNotificationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'friend_joined':
        return 'people';
      case 'comment_reply':
        return 'chatbubble';
      case 'meetup_update':
        return 'calendar';
      case 'episode_complete':
        return 'checkmark-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationMessage = (notification: Notification): string => {
    // For friend_joined notifications, use the profile cache to get the friend's name
    if (notification.type === 'friend_joined' && notification.relatedUserId) {
      const profile = profileCache[notification.relatedUserId];
      if (profile) {
        const friendName = `${profile.firstName} ${profile.lastName}`.trim();
        if (friendName) {
          return `${friendName} just joined Podcast Club`;
        }
      }
      // If we have the related user ID but no name, show "A friend"
      return 'A friend just joined Podcast Club';
    }

    // Fall back to the stored message
    return notification.message;
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const timeAgo = formatDistanceToNow(item.createdAt, { addSuffix: true });
    const message = getNotificationMessage(item);

    // Get avatar for friend_joined notifications
    const profile = item.relatedUserId ? profileCache[item.relatedUserId] : undefined;
    const showAvatar = item.type === 'friend_joined' && profile?.avatarUrl;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.isRead && styles.notificationItemUnread]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, !item.isRead && styles.iconContainerUnread]}>
          {showAvatar ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <Ionicons
              name={getNotificationIcon(item.type)}
              size={20}
              color={!item.isRead ? '#E05F4E' : '#8B8680'}
            />
          )}
        </View>

        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, !item.isRead && styles.notificationTitleUnread]}>
            {item.title}
          </Text>
          <Text style={styles.notificationMessage}>{message}</Text>
          <Text style={styles.notificationTime}>{timeAgo}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteNotification(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={20} color="#C4BFB9" />
        </TouchableOpacity>

        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#403837" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
              <Text style={styles.markAllButtonText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {unreadCount === 0 && <View style={styles.placeholder} />}
        </View>

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E05F4E" />
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-outline" size={64} color="#C4BFB9" />
                <Text style={styles.emptyText}>No notifications yet</Text>
                <Text style={styles.emptySubtext}>
                  We'll notify you when something interesting happens!
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#403837',
  },
  markAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E05F4E',
  },
  placeholder: {
    width: 80,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    position: 'relative',
  },
  notificationItemUnread: {
    backgroundColor: '#FFF5F4',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F6F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerUnread: {
    backgroundColor: '#FFE8E5',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  notificationContent: {
    flex: 1,
    paddingRight: 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 4,
  },
  notificationTitleUnread: {
    color: '#E05F4E',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#403837',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#8B8680',
  },
  deleteButton: {
    padding: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E05F4E',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#403837',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
  },
});
