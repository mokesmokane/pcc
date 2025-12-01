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
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useNotifications } from '../contexts/NotificationsContext';
import Notification from '../data/models/notification.model';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

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
        {!item.isRead && <View style={styles.unreadDot} />}
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
          <Text style={[styles.notificationMessage, !item.isRead && styles.notificationMessageUnread]}>
            {message}
          </Text>
          <Text style={styles.notificationTime}>{timeAgo}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Group notifications by time period
  const groupNotifications = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const thisWeek: Notification[] = [];
    const previous: Notification[] = [];

    notifications.forEach(notification => {
      if (notification.createdAt >= oneWeekAgo) {
        thisWeek.push(notification);
      } else {
        previous.push(notification);
      }
    });

    return { thisWeek, previous };
  };

  const { thisWeek, previous } = groupNotifications();

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View style={styles.titleContent}>
              <Text style={[styles.headerTitle, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>Notifications</Text>
              <Text style={styles.headerSubtitle}>
                Ping! You have an update{notifications.length === 0 && ' (is what we\'ll say if you have any notifications 🙃)'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#403837" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E05F4E" />
          </View>
        ) : (
          <FlatList
            data={[
              ...(thisWeek.length > 0 ? [{ type: 'header', title: 'This week' }] : []),
              ...thisWeek.map(n => ({ type: 'notification', data: n })),
              ...(previous.length > 0 ? [{ type: 'header', title: 'Previous' }] : []),
              ...previous.map(n => ({ type: 'notification', data: n })),
            ]}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return renderSectionHeader(item.title as string);
              }
              return renderNotification({ item: item.data as Notification });
            }}
            keyExtractor={(item, index) =>
              item.type === 'header' ? `header-${item.title}` : (item.data as Notification).id
            }
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
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
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContent: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '400',
    color: '#E05F4E',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8B8680',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B8680',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  listContent: {
    paddingBottom: 40,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
    position: 'relative',
  },
  notificationItemUnread: {
    backgroundColor: '#FFFFFF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E05F4E',
    marginRight: 12,
    marginTop: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F1ED',
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
  },
  notificationMessage: {
    fontSize: 15,
    color: '#403837',
    marginBottom: 4,
    lineHeight: 22,
  },
  notificationMessageUnread: {
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 13,
    color: '#8B8680',
  },
});
