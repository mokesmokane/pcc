import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadService } from '../services/download/download.service';

interface DownloadedEpisode {
  id: string;
  title: string;
  podcastTitle: string;
  artwork: string;
  audioUrl: string;
  localPath: string;
  downloadedAt: number;
}

const DOWNLOADS_KEY = '@downloaded_episodes';

export default function DownloadedScreen() {
  const router = useRouter();
  const [downloads, setDownloads] = useState<DownloadedEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      const stored = await AsyncStorage.getItem(DOWNLOADS_KEY);
      if (stored) {
        const parsedDownloads = JSON.parse(stored);
        // Verify each file still exists
        const verified = await Promise.all(
          parsedDownloads.map(async (d: DownloadedEpisode) => {
            const exists = await downloadService.isDownloaded(d.id);
            return exists ? d : null;
          })
        );
        const validDownloads = verified.filter((d): d is DownloadedEpisode => d !== null);
        setDownloads(validDownloads);

        // Save back the verified list
        if (validDownloads.length !== parsedDownloads.length) {
          await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(validDownloads));
        }
      }
    } catch (error) {
      console.error('Failed to load downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (episode: DownloadedEpisode) => {
    const localPath = await downloadService.getDownloadedFilePath(episode.id);

    router.push({
      pathname: '/(traditional)/podcasts/player',
      params: {
        trackId: episode.id,
        trackTitle: episode.title,
        trackArtist: episode.podcastTitle,
        trackArtwork: episode.artwork,
        trackAudioUrl: localPath || episode.audioUrl,
        trackDescription: '',
        trackDuration: '0',
      },
    });
  };

  const handleDelete = async (episode: DownloadedEpisode) => {
    Alert.alert(
      'Delete Download',
      `Delete "${episode.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await downloadService.deleteDownload(episode.id);

              // Remove from list
              const updated = downloads.filter(d => d.id !== episode.id);
              setDownloads(updated);
              await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));

              Alert.alert('Deleted', 'Download removed');
            } catch (_error) {
              Alert.alert('Error', 'Could not delete download');
            }
          },
        },
      ]
    );
  };

  const renderEpisode = ({ item }: { item: DownloadedEpisode }) => (
    <TouchableOpacity
      style={styles.episodeItem}
      onPress={() => handlePlay(item)}
      activeOpacity={0.7}
    >
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.podcastTitle} numberOfLines={1}>
          {item.podcastTitle}
        </Text>
        <Text style={styles.downloadDate}>
          Downloaded {formatDate(item.downloadedAt)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
      >
        <Ionicons name="trash-outline" size={20} color="#E05F4E" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="download-outline" size={80} color="#C4C1BB" />
      <Text style={styles.emptyTitle}>No Downloaded Episodes</Text>
      <Text style={styles.emptySubtext}>
        Download episodes from your podcasts to listen offline
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Downloaded</Text>
        <Text style={styles.headerSubtitle}>
          {downloads.length} {downloads.length === 1 ? 'episode' : 'episodes'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptySubtext}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={downloads}
          renderItem={renderEpisode}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F3',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE9',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#403837',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B8680',
  },
  list: {
    padding: 16,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  episodeInfo: {
    flex: 1,
    marginRight: 12,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 6,
  },
  podcastTitle: {
    fontSize: 14,
    color: '#8B8680',
    marginBottom: 4,
  },
  downloadDate: {
    fontSize: 12,
    color: '#C4C1BB',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#403837',
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8B8680',
    textAlign: 'center',
    lineHeight: 22,
  },
});
