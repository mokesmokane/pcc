import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranscript } from '../../contexts/TranscriptContext';

interface TranscriptSectionProps {
  onViewAll?: () => void;
  episodeId?: string;
  currentPosition?: number;
}

export function TranscriptSection({ onViewAll, episodeId, currentPosition = 0 }: TranscriptSectionProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const { transcriptDisplay, loading, error, loadTranscript, updatePosition } = useTranscript();
  const updateTimer = useRef<NodeJS.Timeout>();

  // Load transcript when episode changes
  useEffect(() => {
    if (episodeId) {
      loadTranscript(episodeId);
    }
  }, [episodeId]);

  // Debounced position update - only update every 500ms to reduce re-renders
  useEffect(() => {
    if (updateTimer.current) {
      clearTimeout(updateTimer.current);
    }

    updateTimer.current = setTimeout(() => {
      updatePosition(currentPosition);
    }, 500);

    return () => {
      if (updateTimer.current) {
        clearTimeout(updateTimer.current);
      }
    };
  }, [currentPosition]);

  // Format preview text
  const maxCurrentLength = 100;
  const maxUpcomingLength = 200;

  const displayCurrentText = transcriptDisplay?.currentText
    ? (transcriptDisplay.currentText.length > maxCurrentLength
        ? transcriptDisplay.currentText.substring(transcriptDisplay.currentText.length - maxCurrentLength)
        : transcriptDisplay.currentText)
    : '';

  const displayUpcomingText = transcriptDisplay?.upcomingText
    ? transcriptDisplay.upcomingText.substring(0, maxUpcomingLength)
    : '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}>
          Transcript
        </Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAllButton}>View all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Transcript Content */}
      <View style={styles.transcriptContent}>
        {loading ? (
          <ActivityIndicator size="small" color="#E05F4E" />
        ) : error ? (
          <Text style={styles.errorText}>Failed to load transcript</Text>
        ) : !transcriptDisplay || transcriptDisplay.segments.length === 0 ? (
          <Text style={styles.emptyText}>No transcript available</Text>
        ) : (
          <Text
            style={[styles.transcriptText, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}
            numberOfLines={4}
            ellipsizeMode="tail"
          >
            {displayCurrentText}
            <Text style={styles.upcomingText}>{displayUpcomingText ? ` ${  displayUpcomingText}` : ''}</Text>
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
  },
  viewAllButton: {
    fontSize: 14,
    color: '#E05F4E',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  transcriptContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    minHeight: 100,
  },
  transcriptText: {
    fontSize: 28,
    color: '#403837',
    lineHeight: 34,
    fontWeight: '400',
  },
  upcomingText: {
    color: '#B0B0B0',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
});