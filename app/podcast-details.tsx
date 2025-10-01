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
import { Button } from './components/ui/button';
import { useWeeklySelections } from './contexts/WeeklySelectionsContext';
import { useAuth } from './contexts/AuthContext';
import { styles } from './podcast-details.styles';

export default function PodcastDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { selectEpisode, selections } = useWeeklySelections();
  const { user } = useAuth();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const { id } = params;

  const handleChoose = async () => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Save user's choice using the context
      const success = await selectEpisode(id as string);

      if (success) {
        // Navigate to the home screen after choosing
        router.replace('/home');
      } else {
        console.error('Failed to save choice');
      }
    } catch (error) {
      console.error('Error recording choice:', error);
    }
  };
  const podcast = selections.get(id as string);
  return podcast ? (
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
  ) : null;
}