import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';

interface RSSEpisode {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  duration: number;
  audioUrl: string;
  imageUrl: string | null;
}

type SortType = 'recent';

// Simple XML helper to extract text between tags
const extractTag = (xml: string, tag: string): string => {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  if (match) {
    return (match[1] || match[2] || '').trim();
  }
  return '';
};

// Parse duration string (HH:MM:SS or MM:SS or seconds) to seconds
const parseDuration = (durationStr: string): number => {
  if (!durationStr) return 0;

  // If it's just a number, assume seconds
  if (/^\d+$/.test(durationStr)) {
    return parseInt(durationStr, 10);
  }

  // Handle HH:MM:SS or MM:SS format
  const parts = durationStr.split(':').map(p => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

export default function AdminPodcastDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const feedUrl = params.feedUrl as string;
  const podcastTitle = params.podcastTitle as string;
  const podcastImage = params.podcastImage as string;
  const weekStart = params.weekStart as string;
  const category = params.category as string;

  const [episodes, setEpisodes] = useState<RSSEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState<SortType>('recent');
  const [addingEpisode, setAddingEpisode] = useState<string | null>(null);
  const [selectedEpisodeGuids, setSelectedEpisodeGuids] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEpisodes();
    fetchExistingSelections();
  }, [feedUrl]);

  const fetchExistingSelections = async () => {
    if (!weekStart || !category || !feedUrl) return;

    try {
      // Get episodes already selected for this week+category from this feed
      const { data, error } = await supabase
        .from('weekly_category_selections')
        .select(`
          episode_id,
          podcast_episodes!inner(episode_guid, rss_feed_url)
        `)
        .eq('week_start', weekStart)
        .eq('category', category);

      if (error) {
        console.error('Error fetching existing selections:', error);
        return;
      }

      if (data) {
        const guids = new Set<string>();
        for (const item of data) {
          const episode = item.podcast_episodes as any;
          if (episode && episode.rss_feed_url === feedUrl) {
            guids.add(episode.episode_guid);
          }
        }
        setSelectedEpisodeGuids(guids);
        console.log('Already selected episode guids:', Array.from(guids));
      }
    } catch (error) {
      console.error('Error fetching existing selections:', error);
    }
  };

  const fetchEpisodes = async () => {
    if (!feedUrl) {
      Alert.alert('Error', 'No RSS feed URL provided');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(feedUrl, {
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch RSS feed`);
      }

      const xml = await response.text();

      // Parse RSS items
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      const items: RSSEpisode[] = [];
      let match;
      let index = 0;

      while ((match = itemRegex.exec(xml)) !== null && index < 50) {
        const itemXml = match[1];

        // Extract episode data
        const title = extractTag(itemXml, 'title');
        const description = extractTag(itemXml, 'description') || extractTag(itemXml, 'itunes:summary');
        const pubDate = extractTag(itemXml, 'pubDate');
        const durationStr = extractTag(itemXml, 'itunes:duration');

        // Get audio URL from enclosure
        const enclosureMatch = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i);
        const audioUrl = enclosureMatch ? enclosureMatch[1] : '';

        // Get episode image (itunes:image or fallback to podcast image)
        const imageMatch = itemXml.match(/<itunes:image[^>]*href=["']([^"']+)["'][^>]*>/i);
        const imageUrl = imageMatch ? imageMatch[1] : null;

        // Get GUID for unique ID
        const guid = extractTag(itemXml, 'guid') || `${title}-${index}`;

        if (title && audioUrl) {
          items.push({
            id: guid,
            title,
            description: description.replace(/<[^>]*>/g, ''), // Strip HTML but keep full text
            pubDate,
            duration: parseDuration(durationStr),
            audioUrl,
            imageUrl,
          });
        }

        index++;
      }

      setEpisodes(items);
    } catch (error: any) {
      console.error('Error fetching RSS feed:', error);
      Alert.alert('Error', `Failed to fetch episodes: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleAddToWeek = async (episode: RSSEpisode) => {
    console.log('handleAddToWeek called', { episode, weekStart, category, podcastTitle, feedUrl });

    if (!weekStart) {
      console.error('No weekStart provided');
      Alert.alert('Error', 'No week selected');
      return;
    }

    if (addingEpisode) {
      console.log('Already adding episode, skipping');
      return;
    }

    setAddingEpisode(episode.id);

    try {
      const artworkUrl = episode.imageUrl || podcastImage || '';

      // Step 1: Insert episode into podcast_episodes table (upsert to handle duplicates)
      console.log('Step 1: Inserting into podcast_episodes...');
      const episodeData = {
        rss_feed_url: feedUrl,
        episode_guid: episode.id,
        episode_title: episode.title,
        podcast_title: podcastTitle,
        episode_description: episode.description || '',
        audio_url: episode.audioUrl || '',
        duration: episode.duration || 0,
        artwork_url: artworkUrl,
        category: category,
        published_at: episode.pubDate ? new Date(episode.pubDate).toISOString() : new Date().toISOString(),
      };
      console.log('Episode data:', JSON.stringify(episodeData, null, 2));

      const { data: episodeResult, error: episodeError } = await supabase
        .from('podcast_episodes')
        .upsert(episodeData, { onConflict: 'rss_feed_url,episode_guid' })
        .select()
        .single();

      if (episodeError) {
        console.error('Error inserting podcast_episode:', episodeError);
        console.error('Error details:', JSON.stringify(episodeError, null, 2));
        Alert.alert('Error', episodeError.message || 'Failed to add episode');
        return;
      }

      console.log('Episode inserted/updated:', episodeResult);
      const episodeId = episodeResult.id;

      // Step 2: Replace any existing selection for this week+category
      console.log('Step 2: Replacing selection in weekly_category_selections...');

      // First delete any existing selection for this week+category
      const { error: deleteError } = await supabase
        .from('weekly_category_selections')
        .delete()
        .eq('week_start', weekStart)
        .eq('category', category);

      if (deleteError) {
        console.error('Delete error:', deleteError);
      } else {
        console.log('Deleted existing selection (if any)');
      }

      // Now insert the new selection
      const categorySelectionData = {
        week_start: weekStart,
        category: category,
        episode_id: episodeId,
      };
      console.log('Category selection data:', JSON.stringify(categorySelectionData, null, 2));

      const { data: selectionResult, error: selectionError } = await supabase
        .from('weekly_category_selections')
        .insert(categorySelectionData)
        .select();

      console.log('Selection insert result:', { selectionResult, selectionError });

      if (selectionError) {
        console.error('Error inserting weekly_category_selection:', selectionError);
        console.error('Error details:', JSON.stringify(selectionError, null, 2));
        Alert.alert('Error', selectionError.message || 'Failed to add to weekly selection');
        return;
      }

      console.log('Episode added successfully to week!');
      // Update local state - clear previous and show only new selection (only 1 per week+category)
      setSelectedEpisodeGuids(new Set([episode.id]));
      Alert.alert('Switched!', `"${episode.title}" is now the selection for ${category}`);
    } catch (error: any) {
      console.error('Error adding episode:', error);
      console.error('Error stack:', error?.stack);
      Alert.alert('Error', error?.message || 'Failed to add episode');
    } finally {
      setAddingEpisode(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#403837" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{podcastTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Podcast Info */}
      <View style={styles.podcastInfo}>
        {podcastImage && (
          <ExpoImage source={{ uri: podcastImage }} style={styles.podcastImage} contentFit="cover" />
        )}
        <View style={styles.podcastMeta}>
          <Text style={styles.podcastTitle} numberOfLines={2}>{podcastTitle}</Text>
          <Text style={styles.weekLabel}>Adding to: Week of {weekStart}</Text>
          <Text style={styles.categoryLabel}>{category}</Text>
        </View>
      </View>

      {/* Episodes List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
          <Text style={styles.loadingText}>Loading episodes from RSS...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {episodes.length === 0 ? (
            <Text style={styles.emptyText}>No episodes found</Text>
          ) : (
            <>
              <Text style={styles.episodeCount}>{episodes.length} episodes</Text>
              {episodes.map((episode) => {
                const isSelected = selectedEpisodeGuids.has(episode.id);
                const episodeImage = episode.imageUrl || podcastImage;
                return (
                  <View key={episode.id} style={[styles.episodeCard, isSelected && styles.episodeCardSelected]}>
                    {episodeImage && (
                      <ExpoImage
                        source={{ uri: episodeImage }}
                        style={styles.episodeImage}
                        contentFit="cover"
                      />
                    )}
                    <View style={styles.episodeInfo}>
                      <Text style={styles.episodeTitle} numberOfLines={2}>{episode.title}</Text>
                      <View style={styles.episodeMeta}>
                        {episode.pubDate && (
                          <Text style={styles.episodeDate}>{formatDate(episode.pubDate)}</Text>
                        )}
                        {episode.duration > 0 && (
                          <Text style={styles.episodeDuration}>{formatDuration(episode.duration)}</Text>
                        )}
                      </View>
                      {episode.description && (
                        <Text style={styles.episodeDescription} numberOfLines={4}>
                          {episode.description}
                        </Text>
                      )}
                    </View>
                    {isSelected ? (
                      <View style={styles.selectedButton}>
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.addButton, addingEpisode === episode.id && styles.addButtonDisabled]}
                        onPress={() => handleAddToWeek(episode)}
                        disabled={addingEpisode !== null}
                      >
                        {addingEpisode === episode.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="add" size={20} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#403837',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerSpacer: {
    width: 32,
  },
  podcastInfo: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
  },
  podcastImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
  },
  podcastMeta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  podcastTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#403837',
    marginBottom: 6,
  },
  weekLabel: {
    fontSize: 13,
    color: '#E05F4E',
    fontWeight: '500',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#8B8680',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8B8680',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    paddingVertical: 40,
  },
  episodeCount: {
    fontSize: 13,
    color: '#8B8680',
    marginBottom: 4,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  episodeCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F8FFF8',
  },
  episodeImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
    marginRight: 12,
  },
  episodeInfo: {
    flex: 1,
    marginRight: 12,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 6,
  },
  episodeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  episodeDate: {
    fontSize: 12,
    color: '#8B8680',
  },
  episodeDuration: {
    fontSize: 12,
    color: '#8B8680',
  },
  episodeDescription: {
    fontSize: 12,
    color: '#8B8680',
    lineHeight: 18,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E05F4E',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  selectedButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
});
