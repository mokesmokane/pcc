import React, { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useDatabase } from './contexts/DatabaseContext';
import { useAuth } from './contexts/AuthContext';
import { styles } from './styles/onboarding-interests.styles';

const INTERESTS = [
  { id: 'art-design', label: 'Art & Design', emoji: '\uD83C\uDFA8' },
  { id: 'health', label: 'Health', emoji: '\u2764\uFE0F' },
  { id: 'politics', label: 'Politics', emoji: '\uD83C\uDFDB\uFE0F' },
  { id: 'comedy', label: 'Comedy', emoji: '\uD83D\uDE04' },
  { id: 'music', label: 'Music', emoji: '\uD83C\uDFB5' },
  { id: 'history', label: 'History', emoji: '\uD83D\uDCDC' },
  { id: 'relationships', label: 'Relationships', emoji: '\u2764\uFE0F' },
  { id: 'culture', label: 'Culture', emoji: '\uD83C\uDF0D' },
  { id: 'entrepreneurship', label: 'Entrepreneurship', emoji: '\uD83D\uDCA1' },
  { id: 'philosophy', label: 'Philosophy', emoji: '\uD83E\uDD14' },
  { id: 'science', label: 'Science', emoji: '\uD83D\uDD2C' },
  { id: 'technology', label: 'Technology', emoji: '\uD83D\uDCF1' },
  { id: 'personal-development', label: 'Personal Development', emoji: '\uD83C\uDF31' },
];

export default function OnboardingInterestsScreen() {
  const router = useRouter();
  const { struggles } = useLocalSearchParams();
  const [fontsLoaded] = useFonts({ PaytoneOne_400Regular });
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { profileRepository } = useDatabase();
  const { user } = useAuth();

  const isValid = selected.length > 0;

  // Parse struggles from params
  const strugglesArray: string[] = struggles
    ? JSON.parse(struggles as string)
    : [];

  const toggleInterest = (id: string) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!isValid || !user?.id || isLoading) return;

    setIsLoading(true);
    try {
      // Save both struggles and interests to profile
      await profileRepository.saveOnboardingPreferences(
        user.id,
        strugglesArray,
        selected
      );

      // Navigate to ready screen
      router.push('/onboarding-ready');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Still navigate even if save fails - it will sync later
      router.push('/onboarding-ready');
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What&apos;s your jam?</Text>
        <Text style={styles.subtitle}>Choose what gets you listening</Text>

        <View style={styles.tagsContainer}>
          {INTERESTS.map(interest => {
            const isSelected = selected.includes(interest.id);
            return (
              <TouchableOpacity
                key={interest.id}
                style={[
                  styles.tag,
                  isSelected && styles.tagSelected,
                ]}
                onPress={() => toggleInterest(interest.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.tagEmoji}>{interest.emoji}</Text>
                <Text style={[
                  styles.tagLabel,
                  isSelected && styles.tagLabelSelected,
                ]}>
                  {interest.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isValid && !isLoading ? styles.submitButtonEnabled : styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isValid || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.submitButtonIcon}>{'\u2728'}</Text>
              <Text style={styles.submitButtonText}>Show me the good stuff</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
