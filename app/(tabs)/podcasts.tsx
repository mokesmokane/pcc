import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { PodcastSearchResult, searchPodcasts } from '../services/podcastIndex.service';
import { sanitizeTitle } from '../utils/rss';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InfoDialog } from '../components/InfoDialog';

// Store hooks
import {
  useAddSubscription,
  useSubscriptionActions,
  useSubscriptions,
} from '../stores/subscriptionsStore.hooks';
import type { TrackedPodcast } from '../stores/subscriptionsStore';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const ITEM_WIDTH = width / NUM_COLUMNS;

export default function PodcastsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  // Store state (reactive, auto-persisted)
  const podcasts = useSubscriptions();
  const addSubscription = useAddSubscription();
  const { updateSubscription } = useSubscriptionActions();

  // Sort podcasts with tracked ones first
  const sortedPodcasts = useMemo(() => {
    return [...podcasts].sort((a, b) => {
      if (a.tracked && !b.tracked) return -1;
      if (!a.tracked && b.tracked) return 1;
      return 0;
    });
  }, [podcasts]);

  // Local UI state
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PodcastSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [infoDialog, setInfoDialog] = useState<{ visible: boolean; title: string; message: string; type: 'info' | 'success' | 'error' }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const parseOPML = (opmlText: string): TrackedPodcast[] => {
    const parsedPodcasts: TrackedPodcast[] = [];

    // Simple regex-based OPML parser
    const outlineRegex = /<outline[^>]*type="rss"[^>]*>/gi;
    const matches = opmlText.match(outlineRegex);

    if (matches) {
      matches.forEach((match) => {
        const titleMatch = match.match(/text="([^"]*)"/i);
        const xmlUrlMatch = match.match(/xmlUrl="([^"]*)"/i);

        if (titleMatch && xmlUrlMatch) {
          parsedPodcasts.push({
            id: xmlUrlMatch[1],
            title: titleMatch[1],
            feedUrl: xmlUrlMatch[1],
            artwork: '', // Will be fetched from feed
          });
        }
      });
    }

    return parsedPodcasts;
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

      // Get author and sanitize it
      const authorMatch = xmlText.match(/<itunes:author>([^<]*)<\/itunes:author>/i);
      if (authorMatch) {
        author = sanitizeTitle(authorMatch[1]);
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
          setInfoDialog({
            visible: true,
            title: 'No Podcasts Found',
            message: 'No RSS feeds found in the OPML file.',
            type: 'info',
          });
          setLoading(false);
          return;
        }

        // Merge with existing subscriptions (avoid duplicates)
        const existingIds = new Set(podcasts.map(p => p.id));
        const newPodcasts = importedPodcasts.filter(p => !existingIds.has(p.id));

        // Add each new podcast via store action
        newPodcasts.forEach(podcast => addSubscription(podcast));

        setInfoDialog({
          visible: true,
          title: 'Import Successful',
          message: `Imported ${newPodcasts.length} new podcast${newPodcasts.length !== 1 ? 's' : ''}. Fetching artwork...`,
          type: 'success',
        });

        // Fetch artwork in background
        fetchArtworkForPodcasts(newPodcasts);
      }
    } catch (error) {
      console.error('Error importing OPML:', error);
      setInfoDialog({
        visible: true,
        title: 'Import Failed',
        message: 'Could not import OPML file. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchArtworkForPodcasts = async (podcastsToFetch: TrackedPodcast[]) => {
    // Fetch artwork for each podcast
    for (const podcast of podcastsToFetch) {
      try {
        const { artwork, author } = await fetchPodcastArtwork(podcast.feedUrl);

        // Update the podcast with artwork via store action
        updateSubscription(podcast.id, {
          artwork,
          author: author || podcast.author,
        });
      } catch (error) {
        console.error(`Error fetching artwork for ${podcast.title}:`, error);
      }
    }
  };

  const handlePodcastPress = (podcast: TrackedPodcast) => {
    router.push({
      pathname: '/subscribed-podcast-detail',
      params: {
        feedUrl: podcast.feedUrl,
        title: podcast.title,
        artwork: podcast.artwork,
        author: podcast.author || '',
      },
    });
  };

  const renderPodcast = ({ item }: { item: TrackedPodcast }) => (
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
    setShowMenu(false);
    fetchArtworkForPodcasts(podcasts);
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchPodcasts(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setInfoDialog({
        visible: true,
        title: 'Search Error',
        message: 'Failed to search podcasts. Please try again.',
        type: 'error',
      });
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchQueryChange = useCallback((text: string) => {
    setSearchQuery(text);
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(text);
    }, 1000);
  }, [handleSearch]);

  const handleAddFromSearch = (result: PodcastSearchResult) => {
    // Check if already subscribed
    if (podcasts.some(p => p.feedUrl === result.url)) {
      setInfoDialog({
        visible: true,
        title: 'Already Subscribed',
        message: 'You are already subscribed to this podcast.',
        type: 'info',
      });
      return;
    }

    const newPodcast: TrackedPodcast = {
      id: result.url,
      title: sanitizeTitle(result.title),
      artwork: result.artwork || result.image || '',
      feedUrl: result.url,
      author: result.author ? sanitizeTitle(result.author) : undefined,
    };

    // Add via store action (auto-persisted)
    addSubscription(newPodcast);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const openSearch = () => {
    setShowSearch(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderHeader = () => (
    <View style={styles.titleSection}>
      <Text style={[styles.headerTitle, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
        Podcasts
      </Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.headerButton} onPress={openSearch}>
          <Ionicons name="search-outline" size={22} color="#403837" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={() => setShowMenu(true)}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#403837" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMenu = () => (
    <Modal
      visible={showMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMenu(false)}
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={() => setShowMenu(false)}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              handleImportOPML();
            }}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#403837" />
            <Text style={styles.menuItemText}>Import OPML</Text>
          </TouchableOpacity>
          {podcasts.length > 0 && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRefreshArtwork}
            >
              <Ionicons name="refresh-outline" size={20} color="#403837" />
              <Text style={styles.menuItemText}>Refresh Artwork</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSearchResult = ({ item }: { item: PodcastSearchResult }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleAddFromSearch(item)}
      activeOpacity={0.7}
    >
      {item.artwork || item.image ? (
        <Image
          source={{ uri: item.artwork || item.image }}
          style={styles.searchResultImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.searchResultImagePlaceholder}>
          <Ionicons name="mic-outline" size={24} color="#8B8680" />
        </View>
      )}
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.searchResultAuthor} numberOfLines={1}>
          {item.author}
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={28} color="#E05F4E" />
    </TouchableOpacity>
  );

  const renderSearchModal = () => (
    <Modal
      visible={showSearch}
      animationType="slide"
      onRequestClose={() => setShowSearch(false)}
    >
      <View style={[styles.searchContainer, { paddingTop: insets.top }]}>
        <View style={styles.searchHeader}>
          <TouchableOpacity
            style={styles.searchCloseButton}
            onPress={() => setShowSearch(false)}
          >
            <Ionicons name="close" size={24} color="#403837" />
          </TouchableOpacity>
          <Text style={[styles.searchTitle, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
            Search
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#8B8680" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search podcasts..."
            placeholderTextColor="#8B8680"
            value={searchQuery}
            onChangeText={handleSearchQueryChange}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}>
              <Ionicons name="close-circle" size={20} color="#8B8680" />
            </TouchableOpacity>
          )}
        </View>
        {searching ? (
          <View style={styles.searchLoading}>
            <ActivityIndicator size="large" color="#E05F4E" />
            <Text style={styles.searchLoadingText}>Searching...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.searchResultsList}
            showsVerticalScrollIndicator={false}
          />
        ) : searchQuery.length > 0 ? (
          <View style={styles.searchEmpty}>
            <Ionicons name="search-outline" size={48} color="#C4C1BB" />
            <Text style={styles.searchEmptyText}>No podcasts found</Text>
          </View>
        ) : (
          <View style={styles.searchEmpty}>
            <Ionicons name="mic-outline" size={48} color="#C4C1BB" />
            <Text style={styles.searchEmptyText}>Search for your favorite podcasts</Text>
          </View>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {sortedPodcasts.length > 0 ? (
        <FlatList
          data={sortedPodcasts}
          renderItem={renderPodcast}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmpty()
      )}
      {renderMenu()}
      {renderSearchModal()}
      <InfoDialog
        visible={infoDialog.visible}
        title={infoDialog.title}
        message={infoDialog.message}
        type={infoDialog.type}
        onClose={() => setInfoDialog(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#F4F1ED',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
    lineHeight: 38,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    padding: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#403837',
    fontWeight: '500',
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
  searchContainer: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchCloseButton: {
    padding: 4,
  },
  searchTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#E05F4E',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#403837',
  },
  searchLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8B8680',
  },
  searchResultsList: {
    padding: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  searchResultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
  },
  searchResultImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 4,
  },
  searchResultAuthor: {
    fontSize: 13,
    color: '#8B8680',
  },
  searchEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  searchEmptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#8B8680',
    textAlign: 'center',
  },
});
