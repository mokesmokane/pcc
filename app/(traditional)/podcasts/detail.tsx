import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueue, useCurrentTrackOnly } from '../../stores/audioStore.hooks';
import { PodcastDetailHeader } from '../../components/PodcastDetailHeader';
import { downloadService } from '../../services/download/download.service';

interface Episode {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  duration: string;
  durationSeconds: number;
  audioUrl: string;
  artwork?: string;
  isDownloaded?: boolean;
  isDownloading?: boolean;
}

export default function PodcastDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { playNext } = useQueue();
  const currentTrack = useCurrentTrackOnly();

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [podcastInfo, setPodcastInfo] = useState({
    title: params.title as string || 'Podcast',
    artwork: params.artwork as string || '',
    author: params.author as string || '',
  });

  const feedUrl = params.feedUrl as string;

  useEffect(() => {
    if (feedUrl) {
      // Reset state when feed URL changes
      setEpisodes([]);
      setPodcastInfo({
        title: params.title as string || 'Podcast',
        artwork: params.artwork as string || '',
        author: params.author as string || '',
      });
      fetchEpisodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedUrl, params.title, params.artwork, params.author]);

  const checkDownloadStatus = async () => {
    if (episodes.length === 0) return;

    const updatedEpisodes = await Promise.all(
      episodes.map(async (episode) => ({
        ...episode,
        isDownloaded: await downloadService.isDownloaded(episode.id),
      }))
    );

    // Only update if download status actually changed
    const hasChanges = updatedEpisodes.some((ep, idx) =>
      ep.isDownloaded !== episodes[idx].isDownloaded
    );

    if (hasChanges) {
      setEpisodes(updatedEpisodes);
    }
  };

  const fetchEpisodes = async () => {
    try {
      setLoading(true);
      const response = await fetch(feedUrl);
      const xmlText = await response.text();

      // Parse episodes from RSS feed
      const parsedEpisodes = parseRSSEpisodes(xmlText);
      setEpisodes(parsedEpisodes);

      // Check download status after fetching
      setTimeout(() => checkDownloadStatus(), 100);

      // Update podcast info if not provided
      if (!podcastInfo.artwork) {
        const artwork = extractArtwork(xmlText);
        const author = extractAuthor(xmlText);
        setPodcastInfo(prev => ({
          ...prev,
          artwork,
          author,
        }));
      }
    } catch (error) {
      console.error('Error fetching episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractArtwork = (xmlText: string): string => {
    const itunesImageMatch = xmlText.match(/<itunes:image[^>]*href="([^"]*)"/i);
    if (itunesImageMatch) return itunesImageMatch[1];

    const imageMatch = xmlText.match(/<image[^>]*>[\s\S]*?<url>([^<]*)<\/url>/i);
    if (imageMatch) return imageMatch[1];

    return '';
  };

  const extractAuthor = (xmlText: string): string => {
    const authorMatch = xmlText.match(/<itunes:author>([^<]*)<\/itunes:author>/i);
    return authorMatch ? authorMatch[1] : '';
  };

  const parseRSSEpisodes = (xmlText: string): Episode[] => {
    const episodes: Episode[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const matches = xmlText.matchAll(itemRegex);

    const cleanCDATA = (text: string): string => {
      return text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    };

    for (const match of matches) {
      const itemContent = match[1];

      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
      const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);
      const enclosureMatch = itemContent.match(/<enclosure[^>]*url="([^"]*)"[^>]*>/i);
      const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/i);
      const durationMatch = itemContent.match(/<itunes:duration>(.*?)<\/itunes:duration>/i);
      const guidMatch = itemContent.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);

      if (titleMatch && enclosureMatch) {
        const rawDuration = durationMatch ? durationMatch[1] : '';
        const durationSeconds = parseDurationToSeconds(rawDuration);
        const duration = durationSeconds > 0 ? formatDuration(rawDuration) : '';
        const pubDate = pubDateMatch ? formatDate(pubDateMatch[1]) : '';
        const audioUrl = enclosureMatch[1];

        // Clean CDATA from all fields
        const cleanTitle = cleanCDATA(titleMatch[1]);
        const cleanDescription = descMatch ? cleanCDATA(descMatch[1]) : '';
        const cleanGuid = guidMatch ? cleanCDATA(guidMatch[1]) : audioUrl;

        episodes.push({
          id: cleanGuid,
          title: cleanTitle,
          description: cleanDescription,
          pubDate,
          duration,
          durationSeconds,
          audioUrl,
        });
      }
    }

    return episodes;
  };

  const parseDurationToSeconds = (duration: string): number => {
    if (!duration) return 0;

    // Duration can be in seconds or HH:MM:SS format
    if (duration.includes(':')) {
      const parts = duration.split(':').map(p => parseInt(p));
      if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
      }
    }

    const seconds = parseInt(duration);
    return isNaN(seconds) ? 0 : seconds;
  };

  const formatDuration = (duration: string): string => {
    // Duration can be in seconds or HH:MM:SS format
    if (duration.includes(':')) {
      return duration;
    }

    const seconds = parseInt(duration);
    if (isNaN(seconds)) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleEpisodePress = async (episode: Episode) => {
    if (!episode.audioUrl) {
      Alert.alert('Error', 'This episode does not have a valid audio URL');
      return;
    }

    // Just navigate to player to view the episode - don't add to queue yet
    router.push({
      pathname: '/(traditional)/podcasts/player',
      params: {
        trackId: episode.id,
        trackTitle: episode.title,
        trackArtist: podcastInfo.author || podcastInfo.title,
        trackArtwork: podcastInfo.artwork,
        trackAudioUrl: episode.audioUrl,
        trackDescription: episode.description,
        trackDuration: episode.durationSeconds.toString(),
      },
    });
  };

  const handlePlayNext = async (episode: Episode) => {
    await playNext({
      id: episode.id,
      title: episode.title,
      podcast_title: podcastInfo.author || podcastInfo.title,
      artwork_url: podcastInfo.artwork,
      audio_url: episode.audioUrl,
      description: episode.description,
    });
  };

  const handleDownload = async (episode: Episode) => {
    try {
      await downloadService.queueDownload({
        id: episode.id,
        title: episode.title,
        audioUrl: episode.audioUrl,
        podcastTitle: podcastInfo.author || podcastInfo.title,
        artwork: podcastInfo.artwork,
      });

      // Update episode download status
      setEpisodes(prevEpisodes =>
        prevEpisodes.map(e =>
          e.id === episode.id ? { ...e, isDownloading: true } : e
        )
      );

      Alert.alert('Download Started', `Downloading "${episode.title}"`);

      // Refresh status after a delay
      setTimeout(checkDownloadStatus, 2000);
    } catch (_error) {
      Alert.alert('Download Failed', 'Could not start download');
    }
  };

  const handleDeleteDownload = async (episode: Episode) => {
    Alert.alert(
      'Delete Download',
      `Delete downloaded episode "${episode.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await downloadService.deleteDownload(episode.id);
              await checkDownloadStatus();
              Alert.alert('Deleted', 'Download removed');
            } catch (error) {
              Alert.alert('Error', 'Could not delete download');
            }
          },
        },
      ]
    );
  };

  const renderEpisode = ({ item }: { item: Episode }) => {
    const isPlaying = currentTrack?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.episodeItem, isPlaying && styles.episodeItemActive]}
        onPress={() => handleEpisodePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.episodeLeft}>
          {isPlaying && (
            <View style={styles.playingIndicator}>
              <Ionicons name="volume-high" size={16} color="#E05F4E" />
            </View>
          )}
          <View style={styles.episodeInfo}>
            <Text style={[styles.episodeTitle, isPlaying && styles.episodeTitleActive]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.episodeMeta}>
              <Text style={styles.episodeDate}>{item.pubDate}</Text>
              {item.duration && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.episodeDuration}>{item.duration}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.episodeActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePlayNext(item)}
          >
            <Ionicons name="play-skip-forward" size={20} color="#8B8680" />
          </TouchableOpacity>

          {item.isDownloaded ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteDownload(item)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#E05F4E" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownload(item)}
            >
              <Ionicons name="download-outline" size={20} color="#8B8680" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.podcastHeader}>
      {podcastInfo.artwork ? (
        <Image
          source={{ uri: podcastInfo.artwork }}
          style={styles.podcastArtwork}
        />
      ) : (
        <View style={styles.podcastArtworkPlaceholder}>
          <Ionicons name="mic-outline" size={48} color="#8B8680" />
        </View>
      )}
      <Text style={styles.podcastTitle}>{podcastInfo.title}</Text>
      {podcastInfo.author && (
        <Text style={styles.podcastAuthor}>{podcastInfo.author}</Text>
      )}
      <Text style={styles.episodeCount}>
        {episodes.length} {episodes.length === 1 ? 'episode' : 'episodes'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PodcastDetailHeader />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
          <Text style={styles.loadingText}>Loading episodes...</Text>
        </View>
      ) : (
        <FlatList
          data={episodes}
          renderItem={renderEpisode}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.list}
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
  list: {
    padding: 16,
  },
  podcastHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  podcastArtwork: {
    width: 160,
    height: 160,
    borderRadius: 12,
    marginBottom: 16,
  },
  podcastArtworkPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#E8E5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  podcastTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#403837',
    textAlign: 'center',
    marginBottom: 8,
  },
  podcastAuthor: {
    fontSize: 16,
    color: '#8B8680',
    textAlign: 'center',
    marginBottom: 8,
  },
  episodeCount: {
    fontSize: 14,
    color: '#C4C1BB',
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  episodeItemActive: {
    backgroundColor: '#FFF5F3',
    borderWidth: 1,
    borderColor: '#E05F4E',
  },
  episodeLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playingIndicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 6,
  },
  episodeTitleActive: {
    color: '#E05F4E',
  },
  episodeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  episodeDate: {
    fontSize: 13,
    color: '#8B8680',
  },
  metaDot: {
    fontSize: 13,
    color: '#C4C1BB',
  },
  episodeDuration: {
    fontSize: 13,
    color: '#8B8680',
  },
  episodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
});