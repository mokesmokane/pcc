import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const GRID_SPACING = 0;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = width / NUM_COLUMNS;

interface Podcast {
  id: string;
  title: string;
  artwork: string;
  feedUrl: string;
  author?: string;
}

const STORAGE_KEY = '@podcast_subscriptions';

export default function PodcastsScreen() {
  const router = useRouter();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(false);

  // Load subscriptions on mount
  React.useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPodcasts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  const saveSubscriptions = async (subs: Podcast[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
      setPodcasts(subs);
    } catch (error) {
      console.error('Failed to save subscriptions:', error);
    }
  };

  const parseOPML = (opmlText: string): Podcast[] => {
    const podcasts: Podcast[] = [];

    // Simple regex-based OPML parser
    const outlineRegex = /<outline[^>]*type="rss"[^>]*>/gi;
    const matches = opmlText.match(outlineRegex);

    if (matches) {
      matches.forEach((match) => {
        const titleMatch = match.match(/text="([^"]*)"/i);
        const xmlUrlMatch = match.match(/xmlUrl="([^"]*)"/i);

        if (titleMatch && xmlUrlMatch) {
          podcasts.push({
            id: xmlUrlMatch[1],
            title: titleMatch[1],
            feedUrl: xmlUrlMatch[1],
            artwork: '', // Will be fetched from feed
          });
        }
      });
    }

    return podcasts;
  };

  const fetchPodcastArtwork = async (feedUrl: string): Promise<{ artwork: string; author?: string }> => {
    try {
      const response = await fetch(feedUrl);
      const xmlText = await response.text();

      // Extract artwork from iTunes image tag
      let artwork = '';
      let author = '';

      // Try itunes:image first
      const itunesImageMatch = xmlText.match(/<itunes:image[^>]*href="([^"]*)"/i);
      if (itunesImageMatch) {
        artwork = itunesImageMatch[1];
      }

      // Fallback to regular image tag
      if (!artwork) {
        const imageMatch = xmlText.match(/<image[^>]*>[\s\S]*?<url>([^<]*)<\/url>/i);
        if (imageMatch) {
          artwork = imageMatch[1];
        }
      }

      // Get author
      const authorMatch = xmlText.match(/<itunes:author>([^<]*)<\/itunes:author>/i);
      if (authorMatch) {
        author = authorMatch[1];
      }

      return { artwork, author };
    } catch (error) {
      console.error('Error fetching podcast artwork:', error);
      return { artwork: '', author: '' };
    }
  };

  const handleImportOPML = async () => {
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/xml', 'text/x-opml', 'application/xml'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Read the file
        const response = await fetch(file.uri);
        const opmlText = await response.text();

        // Parse OPML
        const importedPodcasts = parseOPML(opmlText);

        if (importedPodcasts.length === 0) {
          Alert.alert('No Podcasts Found', 'No RSS feeds found in the OPML file.');
          setLoading(false);
          return;
        }

        // Merge with existing subscriptions (avoid duplicates)
        const existingIds = new Set(podcasts.map(p => p.id));
        const newPodcasts = importedPodcasts.filter(p => !existingIds.has(p.id));

        // Save immediately so user sees them
        const updatedPodcasts = [...podcasts, ...newPodcasts];
        await saveSubscriptions(updatedPodcasts);

        Alert.alert(
          'Import Successful',
          `Imported ${newPodcasts.length} new podcast${newPodcasts.length !== 1 ? 's' : ''}. Fetching artwork...`
        );

        // Fetch artwork in background
        fetchArtworkForPodcasts(newPodcasts);
      }
    } catch (error) {
      console.error('Error importing OPML:', error);
      Alert.alert('Import Failed', 'Could not import OPML file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchArtworkForPodcasts = async (podcastsToFetch: Podcast[]) => {
    // Fetch artwork for each podcast
    for (const podcast of podcastsToFetch) {
      try {
        const { artwork, author } = await fetchPodcastArtwork(podcast.feedUrl);

        // Update the podcast with artwork
        setPodcasts(current => {
          const updated = current.map(p => {
            if (p.id === podcast.id) {
              return { ...p, artwork, author: author || p.author };
            }
            return p;
          });

          // Save updated list
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      } catch (error) {
        console.error(`Error fetching artwork for ${podcast.title}:`, error);
      }
    }
  };

  const handlePodcastPress = (podcast: Podcast) => {
    router.push({
      pathname: '/(traditional)/podcasts/detail',
      params: {
        feedUrl: podcast.feedUrl,
        title: podcast.title,
        artwork: podcast.artwork,
        author: podcast.author || '',
      },
    });
  };

  const renderPodcast = ({ item }: { item: Podcast }) => (
    <TouchableOpacity
      style={styles.podcastItem}
      onPress={() => handlePodcastPress(item)}
      activeOpacity={0.7}
    >
      {item.artwork ? (
        <Image
          source={{ uri: item.artwork }}
          style={styles.podcastImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.podcastImagePlaceholder}>
          <Ionicons name="mic-outline" size={32} color="#8B8680" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cloud-upload-outline" size={80} color="#C4C1BB" />
      <Text style={styles.emptyTitle}>No Podcasts Yet</Text>
      <Text style={styles.emptySubtext}>
        Import your podcast subscriptions from an OPML file
      </Text>
      <TouchableOpacity
        style={styles.importButton}
        onPress={handleImportOPML}
        disabled={loading}
      >
        <Ionicons name="download-outline" size={20} color="#FFFFFF" />
        <Text style={styles.importButtonText}>
          {loading ? 'Importing...' : 'Import OPML File'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const handleRefreshArtwork = () => {
    Alert.alert(
      'Refresh Artwork',
      'Fetch artwork for all podcasts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: () => {
            fetchArtworkForPodcasts(podcasts);
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Podcasts</Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity
          style={styles.importHeaderButton}
          onPress={handleRefreshArtwork}
          disabled={loading}
        >
          <Ionicons name="refresh-outline" size={24} color="#8B8680" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.importHeaderButton}
          onPress={handleImportOPML}
          disabled={loading}
        >
          <Ionicons name="add-circle-outline" size={24} color="#E05F4E" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {podcasts.length > 0 ? (
        <>
          {renderHeader()}
          <FlatList
            data={podcasts}
            renderItem={renderPodcast}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        renderEmpty()
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GRID_SPACING,
    paddingVertical: 12,
    backgroundColor: '#F8F6F3',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#403837',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  importHeaderButton: {
    padding: 8,
  },
  grid: {
    padding: 0,
  },
  row: {
    justifyContent: 'flex-start',
    marginBottom: 0,
  },
  podcastItem: {
    width: ITEM_WIDTH,
  },
  podcastImage: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    backgroundColor: '#E8E5E1',
  },
  podcastImagePlaceholder: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    backgroundColor: '#E8E5E1',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 32,
    lineHeight: 22,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E05F4E',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});