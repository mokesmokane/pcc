import React, { useState } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { Ionicons } from '@expo/vector-icons';

interface EpisodeRatingModalProps {
  visible: boolean;
  episodeTitle: string;
  podcastTitle?: string;
  artwork?: string;
  onRate: (rating: number) => void;
  onSkip: () => void;
}

export function EpisodeRatingModal({
  visible,
  episodeTitle,
  podcastTitle,
  artwork,
  onRate,
  onSkip,
}: EpisodeRatingModalProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const handleSubmit = () => {
    if (selectedRating !== null) {
      onRate(selectedRating);
      setSelectedRating(null);
    }
  };

  const handleSkip = () => {
    setSelectedRating(null);
    onSkip();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {artwork && (
            <Image
              source={{ uri: artwork }}
              style={styles.artwork}
              resizeMode="cover"
            />
          )}
          <Text style={[styles.title, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
            Rate this episode
          </Text>
          {podcastTitle && (
            <Text style={styles.podcastTitle} numberOfLines={1}>
              {podcastTitle}
            </Text>
          )}
          <Text style={styles.episodeTitle} numberOfLines={2}>
            {episodeTitle}
          </Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setSelectedRating(star)}
                style={styles.starButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={selectedRating !== null && star <= selectedRating ? 'star' : 'star-outline'}
                  size={40}
                  color={selectedRating !== null && star <= selectedRating ? '#E05F4E' : '#8B8680'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              selectedRating === null && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={selectedRating === null}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  artwork: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '400',
    color: '#403837',
    marginBottom: 8,
    textAlign: 'center',
  },
  podcastTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E05F4E',
    marginBottom: 4,
    textAlign: 'center',
  },
  episodeTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8B8680',
    marginBottom: 24,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#E05F4E',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  submitButtonDisabled: {
    backgroundColor: '#E8E5E1',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#8B8680',
  },
});
