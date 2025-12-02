import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TrackedPodcast } from '../stores/subscriptionsStore';
import { useSubscriptions, useToggleTracking } from '../stores/subscriptionsStore.hooks';

interface ManageTrackedPodcastsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PodcastRowProps {
  item: TrackedPodcast;
  onToggle: (id: string) => void;
}

function PodcastRow({ item, onToggle }: PodcastRowProps) {
  const [isOn, setIsOn] = useState(item.tracked || false);

  // Sync with prop when it changes from parent
  useEffect(() => {
    setIsOn(item.tracked || false);
  }, [item.tracked]);

  const handleToggle = useCallback((value: boolean) => {
    setIsOn(value); // Update local state immediately
    onToggle(item.id); // Notify store
  }, [item.id, onToggle]);

  return (
    <View style={styles.podcastItem}>
      {item.artwork ? (
        <Image
          source={{ uri: item.artwork }}
          style={styles.podcastArtwork}
          contentFit="cover"
        />
      ) : (
        <View style={styles.podcastArtworkPlaceholder}>
          <Ionicons name="mic-outline" size={24} color="#8B8680" />
        </View>
      )}
      <View style={styles.podcastInfo}>
        <Text style={styles.podcastTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.author && (
          <Text style={styles.podcastAuthor} numberOfLines={1}>
            {item.author}
          </Text>
        )}
      </View>
      <Switch
        value={isOn}
        onValueChange={handleToggle}
        trackColor={{ false: '#E8E5E1', true: '#E05F4E' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#E8E5E1"
      />
    </View>
  );
}

export function ManageTrackedPodcastsModal({
  visible,
  onClose,
}: ManageTrackedPodcastsModalProps) {
  const insets = useSafeAreaInsets();

  // Use store directly for subscriptions
  const podcasts = useSubscriptions();
  const toggleTracking = useToggleTracking();

  // Sort podcasts with tracked ones first
  const sortedPodcasts = useMemo(() => {
    return [...podcasts].sort((a, b) => {
      if (a.tracked && !b.tracked) return -1;
      if (!a.tracked && b.tracked) return 1;
      return 0;
    });
  }, [podcasts]);

  const renderPodcast = useCallback(({ item }: { item: TrackedPodcast }) => (
    <PodcastRow item={item} onToggle={toggleTracking} />
  ), [toggleTracking]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="albums-outline" size={48} color="#C4C1BB" />
      <Text style={styles.emptyText}>No subscribed podcasts</Text>
      <Text style={styles.emptySubtext}>
        Subscribe to podcasts to track new episodes
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <View style={styles.headerHandle} />
            <Text style={styles.headerTitle}>Track Podcasts</Text>
            <Text style={styles.headerSubtitle}>
              Select podcasts to show in your New tab
            </Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#403837" />
          </TouchableOpacity>

          {sortedPodcasts.length > 0 ? (
            <FlatList
              data={sortedPodcasts}
              renderItem={renderPodcast}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            renderEmpty()
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#F4F1ED',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 300,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
  },
  headerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#C4C1BB',
    borderRadius: 2,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#403837',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  list: {
    padding: 16,
  },
  podcastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  podcastArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
  },
  podcastArtworkPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  podcastTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 2,
  },
  podcastAuthor: {
    fontSize: 13,
    color: '#8B8680',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
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
