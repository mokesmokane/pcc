import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useWeeklySelections } from './contexts/WeeklySelectionsContext';
import { useDatabase } from './contexts/DatabaseContext';
import { CARD_WIDTH, styles } from './weekly-selection.styles';
import type { WeeklyPodcast } from './contexts/WeeklySelectionsContext';
import SpinnerWheel from './components/SpinnerWheel';

// Star burst SVG component
const StarBurst = ({ style }: { style?: object }) => (
  <Svg width="80" height="80" viewBox="0 0 134 144" fill="none" style={style}>
    <Path
      d="M67 0L78.2696 44.5985L120.165 25.6027L92.3225 62.2203L133.295 83.1314L87.3071 84.1943L96.5041 129.266L67 93.9737L37.4959 129.266L46.693 84.1943L0.704903 83.1314L41.6775 62.2203L13.8355 25.6027L55.7304 44.5985L67 0Z"
      fill="#E29160"
    />
  </Svg>
);

export default function WeeklySelectionScreen() {
  const router = useRouter();

  const {
    selections,
    userChoice,
    selectEpisode,
  } = useWeeklySelections();

  const { weeklyCategorySelectionRepository } = useDatabase();

  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Wildcard state
  const [wildcardEpisode, setWildcardEpisode] = useState<WeeklyPodcast | null>(null);
  const [wildcardCategory, setWildcardCategory] = useState<string | null>(null);
  const [loadingWildcard, setLoadingWildcard] = useState(false);
  const cardFlipAnim = useRef(new Animated.Value(0)).current;

  // Calculate snap offsets for smoother snapping
  const snapInterval = CARD_WIDTH + 16;

  // Decode HTML entities in text
  const decodeHtmlEntities = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…');
  };

  // Handle wildcard "Let's Go" - fetch the category episode
  const handleWildcardLetsGo = async (genre: { label: string; icon: string }) => {
    setLoadingWildcard(true);
    setWildcardCategory(genre.label);

    try {
      // Sync and fetch the category selection
      await weeklyCategorySelectionRepository.syncWithRemote();
      const selection = await weeklyCategorySelectionRepository.getSelectionsByCategoryNormalized(genre.label);

      if (selection) {
        // Transform to WeeklyPodcast format (decode HTML entities in text fields)
        const podcast: WeeklyPodcast = {
          id: selection.episodeId,
          category: genre.label,
          categoryLabel: genre.label,
          title: decodeHtmlEntities(selection.podcastTitle || 'Unknown Podcast'),
          source: decodeHtmlEntities(selection.episodeTitle || 'Unknown Episode'),
          clubMembers: 0,
          progress: 0,
          duration: formatDuration(selection.duration || 0),
          durationSeconds: selection.duration || 0,
          episode: decodeHtmlEntities(selection.episodeTitle || 'Unknown Episode'),
          image: selection.artworkUrl || undefined,
          audioUrl: selection.audioUrl,
          description: decodeHtmlEntities(selection.episodeDescription || ''),
        };

        console.log('Setting wildcard episode:', podcast.title);
        setWildcardEpisode(podcast);
        // The podcast-details page uses route params as fallback for podcasts not in selections.

        // Animate the card flip
        Animated.spring(cardFlipAnim, {
          toValue: 1,
          friction: 8,
          tension: 10,
          useNativeDriver: true,
        }).start();
      } else {
        console.log('No episode found for category:', genre.label);
        // Reset loading state but keep spinner visible
        alert(`No podcast found for ${genre.label}. Try another category!`);
      }
    } catch (error) {
      console.error('Error fetching wildcard episode:', error);
    } finally {
      setLoadingWildcard(false);
    }
  };

  // Format duration helper
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Handle respin - reset wildcard state to show spinner again
  const handleRespin = () => {
    setWildcardEpisode(null);
    setWildcardCategory(null);
    cardFlipAnim.setValue(0);
  };

  // Add spinner card to selections
  const podcastDataWithSpinner = useMemo(() => {
    const dataWithSpinner = [...selections.values()];

    // Always add the spinner as the 4th card
    dataWithSpinner.push({
      id: 'spinner',
      category: 'spinner',
      categoryLabel: 'Wild card',
      title: 'None of these floating your boat?',
      source: 'Spin the wheel to reveal your 4th option',
      clubMembers: 0,
      progress: 0,
      duration: '',
      durationSeconds: 0,
      episode: '',
      image: undefined,
      audioUrl: '',
      description: 'Let fate decide your next listen!',
    });

    return dataWithSpinner;
  }, [selections]);

  const handlePodcastPress = async (podcast: WeeklyPodcast) => {
    if (podcast.category === 'spinner') {
      // For now, just spin the wheel in place
      // Later this can navigate to a separate screen
      return;
    } else if (userChoice?.id === podcast.id) {
      // If this is the selected podcast, go to home/player
      router.push('/home');
    } else {
      // Navigate to podcast details with all the podcast data
      router.push({
        pathname: '/podcast-details',
        params: {
          id: podcast.id,
          title: podcast.title,
          source: podcast.source,
          clubMembers: podcast.clubMembers.toString(),
          category: podcast.categoryLabel || podcast.category,
          image: podcast.image || '',
          audioUrl: podcast.audioUrl || '',
          description: podcast.description || ''
        }
      });
    }
  };

  // Only update index when scrolling ends to avoid re-renders during scroll
  const handleScrollEnd = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / snapInterval);
    setCurrentIndex(index);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>This weeks chosen podcasts</Text>
            <Text style={styles.subtitle}>
              Three curated options so you don&apos;t spend ages choosing.
            </Text>
          </View>
        </View>

        <View
          style={styles.scrollContainer}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setContainerHeight(height);
          }}
        >
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + 16}
            snapToAlignment="start"
          >
            <View style={styles.cardsWrapper}>
              {podcastDataWithSpinner.map((podcast, index) => (
                <View key={podcast.id} style={[styles.card, containerHeight > 0 && { height: containerHeight}]}>
                  <View style={styles.cardContent}>
                    {podcast.category === 'spinner' ? (
                      // Special layout for spinner card - show revealed episode or spinner
                      wildcardEpisode ? (
                        // Revealed wildcard episode card
                        <>
                          <View>
                            <View style={styles.cardHeader}>
                              <View style={styles.imageContainer}>
                                {wildcardEpisode.image ? (
                                  <Image source={{ uri: wildcardEpisode.image }} style={styles.podcastImage} />
                                ) : (
                                  <View style={styles.placeholderImage}>
                                    <Text style={styles.placeholderText}>
                                      {wildcardEpisode.title.charAt(0).toUpperCase()}
                                    </Text>
                                  </View>
                                )}
                                <StarBurst style={styles.starBurst} />
                              </View>
                              <Text style={styles.categoryLabel}>{wildcardCategory || 'Wild card'}</Text>
                            </View>

                            <Text style={styles.podcastTitle}>{wildcardEpisode.title}</Text>
                            <Text style={styles.podcastSource}>{wildcardEpisode.source}</Text>

                            <View style={styles.metaContainer}>
                              <View style={styles.membersContainer}>
                                <Text style={styles.fireEmoji}>🎲</Text>
                                <Text style={styles.membersText}>
                                  Your wildcard pick!
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.wildcardButtonsContainer}>
                            <TouchableOpacity
                              onPress={() => handlePodcastPress(wildcardEpisode)}
                              activeOpacity={0.9}
                              style={[
                                styles.tellMeMoreButton,
                                styles.wildcardMainButton,
                                userChoice?.id === wildcardEpisode.id && styles.listenButton
                              ]}
                            >
                              <Text style={[
                                styles.tellMeMoreText,
                                userChoice?.id === wildcardEpisode.id && styles.listenButtonText
                              ]}>
                                {userChoice?.id === wildcardEpisode.id ? 'Listen' : 'Tell me more'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={handleRespin}
                              activeOpacity={0.8}
                              style={styles.respinButton}
                            >
                              <Ionicons name="refresh" size={18} color="#E05F4E" />
                              <Text style={styles.respinButtonText}>Respin</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : loadingWildcard ? (
                        // Loading state
                        <>
                          <View>
                            <View style={styles.spinnerCategoryPill}>
                              <Text style={styles.spinnerCategoryText}>{wildcardCategory || 'Wild card'}</Text>
                            </View>
                            <Text style={[styles.podcastTitle, styles.spinnerTitle]}>Finding your podcast...</Text>
                          </View>
                          <View style={styles.spinnerContainer}>
                            <ActivityIndicator size="large" color="#E05F4E" />
                          </View>
                        </>
                      ) : (
                        // Spinner wheel (initial state)
                        <>
                          <View>
                            <View style={styles.spinnerCategoryPill}>
                              <Text style={styles.spinnerCategoryText}>Wild card</Text>
                            </View>
                            <Text style={[styles.podcastTitle, styles.spinnerTitle]}>{podcast.title}</Text>
                            <Text style={styles.spinnerSubtitle}>{podcast.source}</Text>
                          </View>
                          <View style={styles.spinnerContainer}>
                            <SpinnerWheel onLetsGo={handleWildcardLetsGo} />
                          </View>
                        </>
                      )
                    ) : (
                      // Regular podcast card layout
                      <>
                        <View>
                          <View style={styles.cardHeader}>
                            <View style={styles.imageContainer}>
                              {podcast.image ? (
                                <Image source={{ uri: podcast.image }} style={styles.podcastImage} />
                              ) : (
                                <View style={styles.placeholderImage}>
                                  <Text style={styles.placeholderText}>
                                    {podcast.source.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              <StarBurst style={styles.starBurst} />
                            </View>
                            <Text style={styles.categoryLabel}>{podcast.categoryLabel}</Text>
                          </View>

                          <Text style={styles.podcastTitle}>{podcast.title}</Text>
                          <Text style={styles.podcastSource}>{podcast.source}</Text>

                          <View style={styles.metaContainer}>
                            <View style={styles.membersContainer}>
                              <Text style={styles.fireEmoji}>🔥</Text>
                              <Text style={styles.membersText}>
                                {podcast.clubMembers} people in the club
                              </Text>
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handlePodcastPress(podcast)}
                          activeOpacity={0.9}
                          style={[
                            styles.tellMeMoreButton,
                            userChoice?.id === podcast.id && styles.listenButton
                          ]}
                        >
                          <Text style={[
                            styles.tellMeMoreText,
                            userChoice?.id === podcast.id && styles.listenButtonText
                          ]}>
                            {userChoice?.id === podcast.id ? 'Listen' : 'Tell me more'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </Animated.ScrollView>
        </View>

        <View style={styles.pagination}>
          <View style={{ flexDirection: 'row', position: 'relative' }}>
            {podcastDataWithSpinner.map((_, index) => (
              <View key={index} style={styles.paginationDot} />
            ))}
            {/* Animated active indicator with stretch effect - only render with 2+ items */}
            {podcastDataWithSpinner.length >= 2 && (
              <Animated.View
                style={[
                  styles.paginationDotActive,
                  {
                    position: 'absolute',
                    top: 0,
                    left: 4,
                    // Animate width to stretch between dots
                    width: scrollX.interpolate({
                      inputRange: podcastDataWithSpinner.flatMap((_, i) =>
                        i < podcastDataWithSpinner.length - 1
                          ? [i * snapInterval, (i + 0.5) * snapInterval, (i + 1) * snapInterval]
                          : [i * snapInterval]
                      ),
                      outputRange: podcastDataWithSpinner.flatMap((_, i) =>
                        i < podcastDataWithSpinner.length - 1
                          ? [8, 24, 8] // Normal -> stretched -> normal
                          : [8]
                      ),
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      {
                        translateX: scrollX.interpolate({
                          inputRange: podcastDataWithSpinner.map((_, i) => i * snapInterval),
                          outputRange: podcastDataWithSpinner.map((_, i) => i * 16),
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}