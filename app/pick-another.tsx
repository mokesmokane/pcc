import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWeeklySelections } from './contexts/WeeklySelectionsContext';
import type { WeeklyPodcast } from './contexts/WeeklySelectionsContext';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 60;

export default function PickAnotherScreen() {
  const router = useRouter();
  const {
    selections,
    userChoice
  } = useWeeklySelections();

  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  // Filter out the already completed episode if it exists
  const availableSelections = useMemo(() => {
    const selectionsArray = [...selections.values()];
    // Could filter out completed episodes here if needed
    return selectionsArray;
  }, [selections]);

  const handlePodcastPress = async (podcast: WeeklyPodcast) => {
    // Navigate to podcast details
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
  };

  const handleSkip = () => {
    router.push('/(tabs)/home');
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#403837" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { fontFamily: 'PaytoneOne_400Regular' }]}>
            You're crushing it! 🔥
          </Text>
          <Text style={styles.heroSubtitle}>
            Ready to go for another? Pick from this week's selection.
          </Text>
        </View>

        {/* Podcast Cards */}
        <ScrollView
          style={styles.cardsContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardsContent}
        >
          {availableSelections.map((podcast) => (
            <TouchableOpacity
              key={podcast.id}
              style={styles.podcastCard}
              onPress={() => handlePodcastPress(podcast)}
              activeOpacity={0.9}
            >
              <View style={styles.cardImageContainer}>
                {podcast.image ? (
                  <Image source={{ uri: podcast.image }} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardImage, styles.placeholderImage]}>
                    <Ionicons name="musical-notes" size={40} color="#8B8680" />
                  </View>
                )}
              </View>

              <View style={styles.cardContent}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{podcast.categoryLabel || podcast.category}</Text>
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>
                  {podcast.title}
                </Text>

                <Text style={styles.cardSource} numberOfLines={1}>
                  {podcast.source}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.membersContainer}>
                    <Ionicons name="people" size={16} color="#8B8680" />
                    <Text style={styles.membersText}>
                      {podcast.clubMembers} listening
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#E05F4E" />
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Skip Option */}
          <TouchableOpacity style={styles.skipCard} onPress={handleSkip}>
            <Text style={styles.skipText}>Maybe later</Text>
            <Text style={styles.skipSubtext}>Take me back to home</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    color: '#E05F4E',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#403837',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  cardsContainer: {
    flex: 1,
  },
  cardsContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  podcastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImageContainer: {
    width: 120,
    height: 120,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#F0EDE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF8F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E05F4E',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#403837',
    marginBottom: 4,
  },
  cardSource: {
    fontSize: 13,
    color: '#8B8680',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  membersText: {
    fontSize: 12,
    color: '#8B8680',
  },
  skipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E5E1',
    borderStyle: 'dashed',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B8680',
    marginBottom: 4,
  },
  skipSubtext: {
    fontSize: 13,
    color: '#8B8680',
  },
});