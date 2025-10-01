import { Ionicons } from '@expo/vector-icons';
import { Onest_400Regular, Onest_600SemiBold, useFonts as useOnestFonts } from '@expo-google-fonts/onest';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useChapters } from '../../contexts/ChaptersContext';
import { useAudio } from '../../contexts/AudioContextExpo';
import { chapterService } from '../../services/chapter.service';

interface ChaptersSectionProps {
  episodeId?: string;
  onViewAll?: () => void;
  onChapterPress?: (startSeconds: number) => void;
}

export function ChaptersSection({
  episodeId,
  onViewAll,
  onChapterPress
}: ChaptersSectionProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const [onestFontsLoaded] = useOnestFonts({
    Onest_400Regular,
    Onest_600SemiBold,
  });

  const { formattedChapters, loadChapters, updatePosition, currentChapter } = useChapters();
  const { position, seekTo } = useAudio();
  const scrollViewRef = useRef<ScrollView>(null);
  const previousChapterIdRef = useRef<string | null>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserScrollingRef = useRef(false);

  // Load chapters when episode changes
  useEffect(() => {
    if (episodeId) {
      loadChapters(episodeId);
    }
  }, [episodeId]);

  // Update position in chapters context
  useEffect(() => {
    updatePosition(position);
  }, [position]);

  // Auto-scroll to current chapter only when chapter changes
  useEffect(() => {
    if (currentChapter && scrollViewRef.current && formattedChapters.length > 0) {
      // Only scroll if the chapter actually changed and user isn't scrolling
      if (previousChapterIdRef.current !== currentChapter.id && !isUserScrollingRef.current) {
        const currentIndex = formattedChapters.findIndex(ch => ch.id === currentChapter.id);
        if (currentIndex >= 0) {
          // Calculate scroll position to center current chapter if possible
          const itemHeight = 74; // Approximate height of each chapter item
          const scrollPosition = Math.max(0, (currentIndex - 1) * itemHeight);
          scrollViewRef.current.scrollTo({ y: scrollPosition, animated: true });
        }
      }
      previousChapterIdRef.current = currentChapter.id;
    }
  }, [currentChapter, formattedChapters]);

  const handleScroll = () => {
    // User is scrolling, disable auto-scroll for 5 seconds
    isUserScrollingRef.current = true;

    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }

    userScrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 5000);
  };

  const handleChapterPress = (startSeconds: number) => {
    if (onChapterPress) {
      onChapterPress(startSeconds);
    } else {
      // Default behavior - seek to chapter
      seekTo(startSeconds);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}>
            Chapters
          </Text>
          <Text style={styles.chapterCount}>({formattedChapters.length})</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAllButton}>View all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chapters List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chaptersList}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
              <View style={[
                styles.connectingLine,
                index === formattedChapters.length - 1 && styles.lastConnectingLine
              ]} />
            </View>
            <View style={styles.chapterContent}>
              <Text style={[
                styles.chapterTitle,
                { fontFamily: onestFontsLoaded ? 'Onest_600SemiBold' : undefined },
                chapter.isCurrent && styles.chapterTitleActive
              ]} numberOfLines={2}>
                {chapter.title}
              </Text>
              <Text style={styles.chapterTimestamp}>{chapterService.formatTime(chapter.startSeconds)}</Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#8B8680" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  viewAllButton: {
    fontSize: 14,
    color: '#E05F4E',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  chaptersList: {
    maxHeight: 222, // Height for approximately 3 chapters (74px each)
    paddingBottom: 20,
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
    height: 64,
    backgroundColor: '#E8E5E1',
  },
  lastConnectingLine: {
    height: 20,
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
  moreButton: {
    padding: 4,
    marginLeft: 12,
    marginTop: 4,
  },
});