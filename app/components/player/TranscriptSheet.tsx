import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from './MiniPlayer';
import { useTranscript } from '../../contexts/TranscriptContext';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

interface TranscriptSheetProps {
  visible: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  currentTrack?: {
    title?: string;
    artist?: string;
    artwork?: string;
  };
  episodeId?: string;
  isPlaying: boolean;
  position: number;
  duration: number;
  onPlayPause: () => void;
  onSkipBackward?: () => void;
}

export function TranscriptSheet({
  visible,
  expanded,
  onToggleExpand,
  currentTrack,
  episodeId,
  isPlaying,
  position,
  duration,
  onPlayPause,
  onSkipBackward,
}: TranscriptSheetProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const [menuVisible, setMenuVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const transcriptAnimatedValue = useRef(new Animated.Value(0)).current;
  const transcriptTranslateY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const hasScrolledToInitial = useRef(false);

  const { transcriptDisplay, loading, error, loadTranscript, updatePosition } = useTranscript();

  // Function to format time in mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to copy transcript to clipboard
  const copyTranscriptToClipboard = async () => {
    if (!transcriptDisplay || !transcriptDisplay.segments || transcriptDisplay.segments.length === 0) {
      Alert.alert('No Transcript', 'There is no transcript to copy.');
      return;
    }

    const formattedText = transcriptDisplay.segments
      .map(segment => {
        const startTime = formatTime(segment.startSeconds);
        return `${startTime} ${segment.text}`;
      })
      .join('\n');

    await Clipboard.setStringAsync(formattedText);
    Alert.alert('Copied!', 'Transcript copied to clipboard');
    setMenuVisible(false);
  };

  // Load transcript when episode changes
  useEffect(() => {
    if (episodeId) {
      loadTranscript(episodeId);
    }
  }, [episodeId]);

  // Update position when playback position changes
  useEffect(() => {
    updatePosition(position);
  }, [position]);

  // Scroll to current segment when expanded and segments are loaded
  useEffect(() => {
    if (expanded && transcriptDisplay && transcriptDisplay.segments.length > 0 && !hasScrolledToInitial.current) {
      const currentIndex = transcriptDisplay.currentSegmentIndex;
      if (currentIndex >= 0) {
        // Simple calculation: each segment roughly 40px height
        const approximateOffset = currentIndex * 40;
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, approximateOffset - 100),
            animated: true
          });
          hasScrolledToInitial.current = true;
        }, 300);
      }
    }

    // Reset flag when closing
    if (!expanded) {
      hasScrolledToInitial.current = false;
    }
  }, [expanded, transcriptDisplay]);

  const transcriptPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_evt, gestureState) => {
        transcriptTranslateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 50) {
          // Dragged down enough to dismiss
          onToggleExpand();
        } else {
          // Snap back to position
          Animated.spring(transcriptTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      transcriptTranslateY.setValue(0);
      Animated.timing(transcriptAnimatedValue, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(transcriptAnimatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, expanded]);

  if (!visible) return null;

  // Calculate progress as percentage
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <>
      {/* Mini Player - slides down from top */}
      <Animated.View
        style={[
          styles.miniPlayerOverlay,
          {
            opacity: transcriptAnimatedValue,
            transform: [
              {
                translateY: transcriptAnimatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0],
                }),
              },
            ],
          },
        ]}
      >
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
          <MiniPlayer
            title={currentTrack?.title}
            artist={currentTrack?.artist}
            artwork={currentTrack?.artwork}
            isPlaying={isPlaying}
            progress={progress}
            position={position}
            duration={duration}
            onPlayPause={onPlayPause}
            onPress={onToggleExpand}
            onSkipBackward={onSkipBackward}
          />
        </SafeAreaView>
      </Animated.View>

      {/* Transcript Panel - slides up from bottom */}
      <Animated.View
        style={[
          styles.transcriptPanelOverlay,
          {
            transform: [
              {
                translateY: Animated.add(
                  transcriptAnimatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [680, 0],
                  }),
                  transcriptTranslateY
                ),
              },
            ],
          },
        ]}
      >
        <View style={[styles.container, { marginTop: insets.top + 64 }]}>
          {/* Transcript content with draggable header */}
          <View style={styles.transcriptContainer}>
            {/* Header */}
            <View style={styles.header} {...transcriptPanResponder.panHandlers}>
              <Text style={[styles.title, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}>
                Transcript
              </Text>
              <View style={styles.headerButtons}>
                {/* Menu Button */}
                <TouchableOpacity
                  onPress={() => setMenuVisible(!menuVisible)}
                  style={styles.menuButton}
                >
                  <Ionicons name="ellipsis-vertical" size={24} color="#8B8680" />
                </TouchableOpacity>

                {/* Close Button */}
                <TouchableOpacity onPress={onToggleExpand} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>

              {/* Dropdown Menu */}
              {menuVisible && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={copyTranscriptToClipboard}
                  >
                    <Ionicons name="copy-outline" size={20} color="#403837" />
                    <Text style={styles.menuItemText}>Copy Transcript</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Transcript Content */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E05F4E" />
                <Text style={styles.loadingText}>Loading transcript...</Text>
                <Text style={styles.loadingSubtext}>Episode: {episodeId?.substring(0, 8)}...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load transcript</Text>
                <Text style={styles.errorSubtext}>{error}</Text>
                <TouchableOpacity
                  onPress={() => episodeId && loadTranscript(episodeId)}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : !transcriptDisplay || !transcriptDisplay.segments || transcriptDisplay.segments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No transcript available for this episode</Text>
                <Text style={styles.emptySubtext}>Episode: {episodeId?.substring(0, 8)}...</Text>
              </View>
            ) : (
              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
              >
                {transcriptDisplay.segments.map((segment) => (
                  <View key={segment.id}>
                    <Text
                      style={[
                        styles.segmentText,
                        { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined },
                        segment.isCurrent && styles.currentSegment,
                        segment.isPast && styles.pastSegment,
                        !segment.isPast && !segment.isCurrent && styles.futureSegment,
                      ]}
                    >
                      {segment.text}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  miniPlayerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  transcriptPanelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  transcriptContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 28,
    color: '#8B8680',
    fontWeight: '300',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 4,
    marginRight: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 180,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#403837',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  segmentText: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '400',
    marginBottom: 8,
  },
  currentSegment: {
    color: '#403837', // Black for current segment
  },
  pastSegment: {
    color: '#B0B0B0', // Gray for past segments
  },
  futureSegment: {
    color: '#B0B0B0', // Gray for future segments
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B8680',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#B0B0B0',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#8B8680',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#E05F4E',
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#8B8680',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#B0B0B0',
    textAlign: 'center',
  },
});