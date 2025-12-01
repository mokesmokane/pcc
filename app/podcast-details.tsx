import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  ScrollView,
  Text,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from './components/ui/button';
import { useWeeklySelections } from './contexts/WeeklySelectionsContext';
import { useAuth } from './contexts/AuthContext';
import { styles } from './podcast-details.styles';

const CURRENT_PODCAST_KEY = '@current_podcast_id';

export default function PodcastDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { selectEpisode, selections } = useWeeklySelections();
  const { user } = useAuth();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const { id, title, source, clubMembers, category, image, audioUrl, description } = params;

  // Get podcast from selections, or build from params (for wildcard episodes)
  const podcastFromSelections = selections.get(id as string);
  const podcast = podcastFromSelections || {
    id: id as string,
    title: title as string || 'Unknown Podcast',
    source: source as string || 'Unknown Episode',
    clubMembers: parseInt(clubMembers as string || '0', 10),
    category: category as string || 'Podcast',
    categoryLabel: category as string || 'Podcast',
    image: image as string || undefined,
    audioUrl: audioUrl as string || '',
    description: description as string || '',
    progress: 0,
    duration: '',
    durationSeconds: 0,
    episode: source as string || '',
  };

  const handleChoose = async () => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Save user's choice using the context (pass podcast for wildcards not in selections)
      const success = await selectEpisode(id as string, podcast);

      if (success) {
        // Save as the current podcast so it shows first on home screen
        await AsyncStorage.setItem(CURRENT_PODCAST_KEY, id as string);
        // Navigate to the home screen after choosing
        router.replace('/home');
      } else {
        console.error('Failed to save choice');
      }
    } catch (error) {
      console.error('Error recording choice:', error);
    }
  };
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Podcast Image */}
        {podcast?.image && podcast.image !== '' ? (
          <Image
            source={{ uri: podcast.image as string }}
            style={styles.podcastImage}
          />
        ) : (
          <View style={[styles.podcastImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>
              {(podcast?.source as string || 'P').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Podcast Info */}
        <View style={styles.podcastInfo}>
          <View style={styles.categoryContainer}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{podcast?.category}</Text>
            </View>
          </View>
          <Text style={[styles.title, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>{podcast?.title}</Text>
          <Text style={styles.source}>{podcast?.source}</Text>
          <View style={styles.membersContainer}>
            <Text style={styles.fireEmoji}>🔥</Text>
            <Text style={styles.membersText}>
              {podcast?.clubMembers} people in the club
            </Text>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this episode:</Text>
          <Text style={styles.sectionText}>
            {podcast?.about || podcast?.description || 'No description available for this episode.'}
          </Text>
        </View>

        {/* Why We Chose It Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why we chose it:</Text>
          <Text style={styles.sectionText}>
            {podcast?.whyWeLoveIt || 'Our curators are still working on the perfect description for why this episode is special. Check back soon!'}
          </Text>
        </View>
      </ScrollView>

      {/* Choose Button */}
      <View style={[styles.buttonContainer, { paddingBottom: 68 }]}>
        <Button
          onPress={handleChoose}
          style={styles.chooseButton}
        >
          I choose this one
        </Button>
      </View>
    </SafeAreaView>
  );
}