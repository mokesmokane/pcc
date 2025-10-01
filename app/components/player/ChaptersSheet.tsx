import { Ionicons } from '@expo/vector-icons';
import { Onest_400Regular, Onest_600SemiBold, useFonts as useOnestFonts } from '@expo-google-fonts/onest';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from './MiniPlayer';
import { useChapters } from '../../contexts/ChaptersContext';
import { useAudio } from '../../contexts/AudioContextExpo';
import { chapterService } from '../../services/chapter.service';

interface ChaptersSheetProps {
  visible: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  currentTrack?: {
    title?: string;
    artist?: string;
    artwork?: string;
    episodeId?: string;
  };
  isPlaying: boolean;
  position: number;
  duration: number;
  onPlayPause: () => void;
  onSkipBackward?: () => void;
  onChapterPress?: (startSeconds: number) => void;
}

export function ChaptersSheet({
  visible,
  expanded,
  onToggleExpand,
  currentTrack,
  isPlaying,
  position,
  duration,
  onPlayPause,
  onSkipBackward,
  onChapterPress,
}: ChaptersSheetProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const [onestFontsLoaded] = useOnestFonts({
    Onest_400Regular,
    Onest_600SemiBold,
  });

  const { formattedChapters, loadChapters, updatePosition } = useChapters();
  const { seekTo } = useAudio();

  const insets = useSafeAreaInsets();
  const chaptersAnimatedValue = useRef(new Animated.Value(0)).current;
  const chaptersTranslateY = useRef(new Animated.Value(0)).current;

  const chaptersPanResponder = useRef(
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
        chaptersTranslateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 50) {
          // Dragged down enough to dismiss
          onToggleExpand();
        } else {
          // Snap back to position
          Animated.spring(chaptersTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Load chapters when episode changes
  useEffect(() => {
    if (currentTrack?.episodeId) {
      loadChapters(currentTrack.episodeId);
    }
  }, [currentTrack?.episodeId]);

  // Update position in chapters context
  useEffect(() => {
    updatePosition(position);
  }, [position]);

  const handleChapterPress = (startSeconds: number) => {
    if (onChapterPress) {
      onChapterPress(startSeconds);
    } else {
      // Default behavior - seek to chapter
      seekTo(startSeconds);
    }
  };

  useEffect(() => {
    if (visible) {
      chaptersTranslateY.setValue(0);
      Animated.timing(chaptersAnimatedValue, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(chaptersAnimatedValue, {
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
            opacity: chaptersAnimatedValue,
            transform: [
              {
                translateY: chaptersAnimatedValue.interpolate({
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

      {/* Chapters Panel - slides up from bottom */}
      <Animated.View
        style={[
          styles.chaptersPanelOverlay,
          {
            transform: [
              {
                translateY: Animated.add(
                  chaptersAnimatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [680, 0],
                  }),
                  chaptersTranslateY
                ),
              },
            ],
          },
        ]}
      >
        <View style={[styles.container, { marginTop: insets.top + 64 }]}>
          {/* Chapters content with draggable header */}
          <View style={styles.chaptersContainer}>
            {/* Header */}
            <View style={[styles.header, chaptersPanResponder.panHandlers]} {...chaptersPanResponder.panHandlers}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}>
                  Chapters
                </Text>
                <Text style={styles.chapterCount}>({formattedChapters.length})</Text>
              </View>
              <TouchableOpacity onPress={onToggleExpand} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Chapters List */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {formattedChapters.map((chapter, index) => (
                <TouchableOpacity
                  key={chapter.id}
                  style={styles.chapterItem}
                  onPress={() => handleChapterPress(chapter.startSeconds)}
                >
                  <View style={styles.numberContainer}>
                    <View style={[
                      styles.numberCircle,
                      chapter.isCurrent && styles.numberCircleActive
                    ]}>
                      <Text style={[
                        styles.chapterNumber,
                        { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined },
                        chapter.isCurrent && styles.chapterNumberActive
                      ]}>{index + 1}</Text>
                    </View>
                    {index < formattedChapters.length - 1 && (
                      <View style={styles.connectingLine} />
                    )}
                  </View>
                  <View style={styles.chapterContent}>
                    <Text style={[
                      styles.chapterTitle,
                      { fontFamily: onestFontsLoaded ? 'Onest_600SemiBold' : undefined },
                      chapter.isCurrent && styles.chapterTitleActive
                    ]} numberOfLines={1}>
                      {chapter.title}
                    </Text>
                    {chapter.description && (
                      <Text style={[
                        styles.chapterDescription,
                        { fontFamily: onestFontsLoaded ? 'Onest_400Regular' : undefined }
                      ]} numberOfLines={3}>
                        {chapter.description}
                      </Text>
                    )}
                    <Text style={styles.chapterTimestamp}>{chapterService.formatTime(chapter.startSeconds)}</Text>
                  </View>
                  <TouchableOpacity style={styles.moreButton}>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#8B8680" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  chaptersPanelOverlay: {
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
  chaptersContainer: {
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
  },
  chapterCount: {
    fontSize: 12,
    fontFamily: 'aristata',
    color: '#E05F4E',
    position: 'relative',
    top: 8,
    marginLeft: 2,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 28,
    color: '#8B8680',
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  numberContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  numberCircle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: '#F0EDE9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  numberCircleActive: {
    backgroundColor: '#E05F4E',
  },
  chapterNumber: {
    fontSize: 18,
    fontWeight: '400',
    color: '#403837',
  },
  chapterNumberActive: {
    color: '#FFFFFF',
  },
  connectingLine: {
    position: 'absolute',
    top: 40,
    width: 2,
    height: 120, // Increased to accommodate description text
    backgroundColor: '#E8E5E1',
  },
  chapterContent: {
    flex: 1,
    paddingTop: 4,
  },
  chapterTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#403837',
    marginBottom: 4,
  },
  chapterTitleActive: {
    color: '#E05F4E',
  },
  chapterTimestamp: {
    fontSize: 13,
    color: '#8B8680',
  },
  chapterDescription: {
    fontSize: 13,
    color: '#6B6561',
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 18,
  },
  moreButton: {
    padding: 4,
    marginLeft: 12,
    marginTop: 4,
  },
});