import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';
import { DiscussionSheet } from './player/DiscussionSheet';
import { useSaveDiscussionResponse, useQuestionStats, useNextQuestion } from '../hooks/queries/useDiscussion';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;
const CARD_WIDTH = SCREEN_WIDTH - 40;

export interface DiscussionTopic {
  id: string;
  question: string;
  questionType: 'agreement' | 'multiple_choice';
  imageUrl?: string; // Optional image representing the question
  options: {
    value: number;
    label: string;
    emoji?: string; // Optional emoji for agreement scales
    imageUrl?: string; // Optional image for each option
  }[];
}

export interface TopicResults {
  value: number;
  label: string;
  count: number;
  percentage: number;
  userSelected?: boolean; // Whether the current user selected this option
}

export interface TopicComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  comment: string;
  createdAt: Date;
  likesCount: number;
}

interface DiscussionTopicsStackProps {
  episodeId: string;
  topics: DiscussionTopic[]; // Receive topics from parent (already filtered to unanswered)
  onComplete: () => void;
  getComments: (topicId: string) => TopicComment[];
  onAddComment: (topicId: string, comment: string) => void;
  onDiscussionClose?: (topicId: string) => void; // Called when discussion sheet closes
}

export function DiscussionTopicsStack({
  episodeId,
  topics, // Receive pre-filtered unanswered topics from parent
  onComplete,
  getComments,
  onAddComment: _onAddComment,
  onDiscussionClose,
}: DiscussionTopicsStackProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const saveResponseMutation = useSaveDiscussionResponse();
  const invalidateUnanswered = useNextQuestion();

  // UI state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentOptionIndex, setCurrentOptionIndex] = useState(0);

  // Get current topic
  const currentTopic = topics[currentQuestionIndex];

  // Fetch stats for current question (automatically cached!)
  const { data: stats = [] } = useQuestionStats(currentTopic?.id || '');

  // Temporary state for current swipe session (before submitting)
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [disagreedOptions, setDisagreedOptions] = useState<number[]>([]);

  // Track when we just finished answering the current question (to show results)
  const [justAnsweredQuestionId, setJustAnsweredQuestionId] = useState<string | null>(null);

  // UI/animation state
  const [swipingCardIndex, setSwipingCardIndex] = useState<number | null>(null);
  const [expandedResultIndex, setExpandedResultIndex] = useState<number | null>(null);
  const [showFullDiscussion, setShowFullDiscussion] = useState(false);
  const [discussionExpanded, setDiscussionExpanded] = useState(false);
  const [selectedTopicForComments, setSelectedTopicForComments] = useState<string | null>(null);

  // Convert stats to TopicResults format
  const results: TopicResults[] = useMemo(() => {
    if (!currentTopic) return [];

    return currentTopic.options.map((option) => {
      const optionStat = stats.find((s) => s.optionValue === option.value);
      const totalResponses = (optionStat?.agreeCount || 0) + (optionStat?.disagreeCount || 0);
      const agreeCount = optionStat?.agreeCount || 0;
      const percentage = totalResponses > 0 ? (agreeCount / totalResponses) * 100 : 0;

      return {
        value: option.value,
        label: option.label,
        count: agreeCount,
        percentage,
        userSelected: selectedOptions.includes(option.value),
      };
    });
  }, [currentTopic, stats, selectedOptions]);

  // Create a fresh Animated.ValueXY for each new top card
  const position = useMemo(
    () => new Animated.ValueXY({ x: 0, y: 0 }),
    [currentOptionIndex]
  );
  const swipeProgress = useRef(new Animated.Value(0)).current;

  // Animated values for result bars (create refs for up to 10 results)
  const resultAnimations = useRef(
    Array.from({ length: 10 }, () => ({
      barTranslateX: new Animated.Value(0),
      numbersTranslateX: new Animated.Value(100),
      numbersOpacity: new Animated.Value(0),
    }))
  ).current;

  // Show results if we just answered this question
  const hasAnswered = currentTopic ? justAnsweredQuestionId === currentTopic.id : false;
  const showResults = hasAnswered;
  const allOptionsViewed = currentOptionIndex >= currentTopic?.options.length;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  // FAB button scales based on swipe direction
  const agreeFabScale = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [1, 1.15],
    extrapolate: 'clamp',
  });

  const disagreeFabScale = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1.15, 1],
    extrapolate: 'clamp',
  });

  const handleSwipe = useCallback(async (selected: boolean) => {
    if (!currentTopic) return;

    const currentOption = currentTopic.options[currentOptionIndex];

    const newSelectedOptions = selected
      ? [...selectedOptions, currentOption.value]
      : selectedOptions;

    const newDisagreedOptions = !selected
      ? [...disagreedOptions, currentOption.value]
      : disagreedOptions;

    // Move to next option
    if (currentOptionIndex < currentTopic.options.length - 1) {
      setCurrentOptionIndex(currentOptionIndex + 1);
      setSelectedOptions(newSelectedOptions);
      setDisagreedOptions(newDisagreedOptions);
    } else {
      // All options swiped - submit answers to context/database
      setSelectedOptions(newSelectedOptions);
      setDisagreedOptions(newDisagreedOptions);

      // Mark this question as just answered IMMEDIATELY to show results (before mutation completes)
      // This prevents the last card from reappearing during the database save
      console.log('[DiscussionTopicsStack] Question answered, showing results immediately');
      setJustAnsweredQuestionId(currentTopic.id);

      // Save response using mutation in background (don't block UI on this)
      console.log('[DiscussionTopicsStack] Saving response for question:', currentTopic.id);
      saveResponseMutation.mutateAsync({
        questionId: currentTopic.id,
        episodeId,
        agreedValues: newSelectedOptions,
        disagreedValues: newDisagreedOptions,
      }).catch((error) => {
        console.error('[DiscussionTopicsStack] Failed to save response:', error);
        // TODO: Could show user a retry option or notification
      });
    }
  }, [currentTopic, currentOptionIndex, selectedOptions, disagreedOptions, saveResponseMutation, episodeId]);

  const swipeRight = useCallback(() => {
    setSwipingCardIndex(currentOptionIndex);
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: SCREEN_WIDTH + 100, y: 0 },
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(swipeProgress, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // 1) Advance state so the old top card no longer renders
      handleSwipe(true);

      // 2) Immediately clear swipingCardIndex to unmount the swiped card
      setSwipingCardIndex(null);

      // 3) On the next frame, reset the shared animated values (after card is gone)
      requestAnimationFrame(() => {
        position.setValue({ x: 0, y: 0 });
        swipeProgress.setValue(0);
      });
    });
  }, [position, swipeProgress, handleSwipe, currentOptionIndex]);

  const swipeLeft = useCallback(() => {
    setSwipingCardIndex(currentOptionIndex);
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(swipeProgress, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // 1) Advance state so the old top card no longer renders
      handleSwipe(false);

      // 2) Immediately clear swipingCardIndex to unmount the swiped card
      setSwipingCardIndex(null);

      // 3) On the next frame, reset the shared animated values (after card is gone)
      requestAnimationFrame(() => {
        position.setValue({ x: 0, y: 0 });
        swipeProgress.setValue(0);
      });
    });
  }, [position, swipeProgress, handleSwipe, currentOptionIndex]);

  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  }, [position]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => {
      return Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10;
    },
    onPanResponderGrant: () => {
      position.setOffset({
        x: (position.x as any)._value,
        y: (position.y as any)._value,
      });
      position.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      position.flattenOffset();

      if (gesture.dx > SWIPE_THRESHOLD) {
        swipeRight();
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        swipeLeft();
      } else {
        resetPosition();
      }
    },
  }), [position, swipeRight, swipeLeft, resetPosition]);

  const renderQuestion = () => {
    if (!currentTopic) return null;

    return (
      <View style={styles.questionPage}>
        {/* Question title at top - 30% */}
        <View style={styles.questionHeader}>
          <View style={styles.questionTouchable}>
            <Text style={styles.question}>
              {currentTopic.question}
            </Text>
            {/* Progress dots */}
            <View style={styles.progressDots}>
              {topics.map((_, dotIndex) => (
                <View
                  key={dotIndex}
                  style={[styles.progressDot, dotIndex === currentQuestionIndex && styles.progressDotActive]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Options or Results */}
        {!showResults ? (
          <View style={styles.optionsContainer}>
            {/* Answer cards stack - 70% */}
            <View style={styles.cardsContainer}>
                {currentTopic.options.map((option, optionIdx) => {
                  // Keep the card being swiped, filter out already swiped cards
                  const isSwipingCard = swipingCardIndex === optionIdx;
                  if (optionIdx < currentOptionIndex && !isSwipingCard) return null;

                  const isTopCard = optionIdx === currentOptionIndex && swipingCardIndex === null;
                  const cardStyle: any = {
                    zIndex: currentTopic.options.length - optionIdx,
                  };

                  // ALL cards use the same transform structure to prevent flashing
                  if (isSwipingCard) {
                    // Card currently being swiped
                    cardStyle.transform = [
                      { translateX: position.x },
                      { translateY: position.y },
                      { rotate },
                      { scale: 1 },
                    ];
                  } else if (isTopCard) {
                    // Current top card (not swiping)
                    cardStyle.transform = [
                      { translateX: position.x },
                      { translateY: position.y },
                      { rotate },
                      { scale: 1 },
                    ];
                  } else {
                    // Cards behind - animate them moving forward during swipe
                    const effectiveCurrentIndex = swipingCardIndex !== null ? swipingCardIndex : currentOptionIndex;
                    const relativePosition = optionIdx - effectiveCurrentIndex;

                    // When swiping, animate cards forward using consistent transform structure
                    if (swipingCardIndex !== null) {
                      // Animate translateY (up) and scale (grow) as card moves forward
                      const animatedTranslateY = swipeProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [relativePosition * -10, (relativePosition - 1) * -10],
                      });

                      const animatedScale = swipeProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1 - relativePosition * 0.05, 1 - (relativePosition - 1) * 0.05],
                      });

                      cardStyle.transform = [
                        { translateX: 0 },
                        { translateY: animatedTranslateY },
                        { rotate: '0deg' },
                        { scale: animatedScale },
                      ];
                    } else {
                      // Static position when not swiping - same structure
                      cardStyle.transform = [
                        { translateX: 0 },
                        { translateY: relativePosition * -10 },
                        { rotate: '0deg' },
                        { scale: 1 - relativePosition * 0.05 },
                      ];
                    }
                  }

                  const canInteract = (isTopCard || isSwipingCard) && swipingCardIndex === null;

                  // Hide cards that have been swiped away (below currentOptionIndex)
                  if (optionIdx < currentOptionIndex && !isSwipingCard) {
                    cardStyle.opacity = 0;
                  } else {
                    cardStyle.opacity = 1;
                  }

                  // Interpolations for vote overlays (only for top/swiping card)
                  const agreeOpacity = position.x.interpolate({
                    inputRange: [0, SWIPE_THRESHOLD],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  });

                  const disagreeOpacity = position.x.interpolate({
                    inputRange: [-SWIPE_THRESHOLD, 0],
                    outputRange: [1, 0],
                    extrapolate: 'clamp',
                  });

                  const badgeScale = position.x.interpolate({
                    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
                    outputRange: [1, 0.95, 1],
                    extrapolate: 'clamp',
                  });

                  return (
                    <Animated.View
                      key={option.value}
                      style={[styles.answerCard, cardStyle]}
                      {...(canInteract ? panResponder.panHandlers : {})}
                      pointerEvents={canInteract ? 'auto' : 'none'}
                    >
                      {/* Image fills entire card */}
                      {option.imageUrl ? (
                        <Image
                          source={{ uri: option.imageUrl }}
                          style={styles.cardImageFull}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.cardImagePlaceholder}>
                          <Ionicons name="image-outline" size={64} color="#C4BFB9" />
                        </View>
                      )}

                      {/* Vote overlays - only show for top card */}
                      {(isTopCard || isSwipingCard) && (
                        <>
                          {/* RIGHT / AGREE overlay */}
                          <Animated.View
                            pointerEvents="none"
                            style={[
                              styles.voteOverlay,
                              styles.voteOverlayAgree,
                              { opacity: agreeOpacity, transform: [{ scale: badgeScale }] },
                            ]}
                          >
                            <View style={styles.voteBadge}>
                              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
                              <Text style={styles.voteText}>AGREE</Text>
                            </View>
                          </Animated.View>

                          {/* LEFT / DISAGREE overlay */}
                          <Animated.View
                            pointerEvents="none"
                            style={[
                              styles.voteOverlay,
                              styles.voteOverlayDisagree,
                              { opacity: disagreeOpacity, transform: [{ scale: badgeScale }] },
                            ]}
                          >
                            <View style={styles.voteBadge}>
                              <Ionicons name="close" size={36} color="#FFFFFF" />
                              <Text style={styles.voteText}>DISAGREE</Text>
                            </View>
                          </Animated.View>
                        </>
                      )}

                      {/* Text bubble at bottom */}
                      <View style={styles.cardTextBubble}>
                        <Text style={styles.answerCardText}>{option.label}</Text>
                      </View>
                    </Animated.View>
                  );
                })}

                {allOptionsViewed && !showResults && (
                  <View style={styles.allDoneCard}>
                    <Ionicons name="checkmark-circle" size={48} color="#E05F4E" />
                    <Text style={styles.allDoneText}>All done!</Text>
                    <Text style={styles.allDoneSubtext}>
                      You selected {selectedOptions.length} option{selectedOptions.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
          </View>
        ) : (
          <View style={styles.resultsWrapper}>
            <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsScrollContent}>
              <View style={styles.resultsContainer}>
              {/* Results Bars */}
              <View style={styles.resultsSection}>
                {results.map((result, index) => {
                  // Calculate the opposite percentage (for dual-sided bar)
                  const agreePercentage = result.percentage;
                  const disagreePercentage = 100 - result.percentage;

                  // Get the animated values for this result
                  const { barTranslateX, numbersTranslateX, numbersOpacity } = resultAnimations[index];

                  // Check if user agreed or disagreed with this option (from local state)
                  const userAgreed = selectedOptions.includes(result.value);
                  const userDisagreed = disagreedOptions.includes(result.value);

                  return (
                    <TouchableOpacity
                      key={result.value}
                      style={styles.resultRow}
                      onPress={() => handleResultBarPress(index)}
                      activeOpacity={0.7}
                    >
                      {/* Option Label */}
                      <View style={styles.resultLabelRow}>
                        <View style={styles.resultLabelWithIcons}>
                          {/* Left icon - cross (grey if user agreed, orange if user disagreed) */}
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color={userDisagreed ? "#E05F4E" : "#C4BFB9"}
                          />

                          {/* Center text */}
                          <Text
                            style={[
                              styles.resultLabel,
                              styles.resultLabelCentered,
                              (userAgreed || userDisagreed) && styles.resultLabelHighlight,
                            ]}
                          >
                            {result.label}
                          </Text>

                          {/* Right icon - check (grey if user disagreed, orange if user agreed) */}
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={userAgreed ? "#E05F4E" : "#C4BFB9"}
                          />
                        </View>
                      </View>

                      {/* Container for bar and numbers */}
                      <View style={styles.barAnimationContainer}>
                        {/* Dual-sided Bar (animated) */}
                        <Animated.View
                          style={[
                            styles.dualBarContainer,
                            { transform: [{ translateX: barTranslateX }] },
                          ]}
                        >
                          {/* Disagree bar (left - white with cross) */}
                          <View style={[styles.barSide, styles.barSideDisagree, { flex: disagreePercentage }]}>
                            {disagreePercentage >= 10 && (
                              <Ionicons name="close" size={24} color="#E05F4E" />
                            )}
                          </View>

                          {/* Gap between bars */}
                          <View style={styles.barGap} />

                          {/* Agree bar (right - orange with tick) */}
                          <View style={[styles.barSide, styles.barSideAgree, { flex: agreePercentage }]}>
                            {agreePercentage >= 10 && (
                              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                            )}
                          </View>
                        </Animated.View>

                        {/* Percentage numbers and discussion button (animated) */}
                        <Animated.View
                          style={[
                            styles.percentageNumbersContainer,
                            {
                              transform: [{ translateX: numbersTranslateX }],
                              opacity: numbersOpacity,
                            },
                          ]}
                        >
                          <View style={styles.statsRow}>
                            {/* Percentage stats */}
                            <View style={styles.percentageNumbers}>
                              <View style={styles.percentageItem}>
                                <Ionicons name="close" size={16} color="#E05F4E" />
                                <Text style={styles.percentageText}>{disagreePercentage.toFixed(0)}%</Text>
                              </View>
                              <View style={styles.percentageItem}>
                                <Ionicons name="checkmark" size={16} color="#E05F4E" />
                                <Text style={styles.percentageText}>{agreePercentage.toFixed(0)}%</Text>
                              </View>
                            </View>

                            {/* Discussion Button */}
                            <TouchableOpacity
                              style={styles.discussionButton}
                              onPress={() => handleOpenComments(currentTopic.id)}
                            >
                              {getComments(currentTopic.id).length > 0 ? (
                                <>
                                  {/* Show avatars and count if comments exist */}
                                  <View style={styles.commentsAvatars}>
                                    {getComments(currentTopic.id).slice(0, 3).map((comment, idx) => (
                                      <View key={comment.id} style={[styles.avatar, { marginLeft: idx > 0 ? -8 : 0 }]}>
                                        <Text style={styles.avatarText}>
                                          {comment.userName.charAt(0).toUpperCase()}
                                        </Text>
                                      </View>
                                    ))}
                                  </View>
                                  <Text style={styles.commentsCount}>
                                    {getComments(currentTopic.id).length} {getComments(currentTopic.id).length === 1 ? 'comment' : 'comments'}
                                  </Text>
                                  <Ionicons name="chevron-forward" size={14} color="#8B8680" />
                                </>
                              ) : (
                                <>
                                  <Ionicons name="chatbubble-outline" size={16} color="#E05F4E" />
                                  <Text style={styles.discussionButtonText}>Discuss</Text>
                                  <Ionicons name="chevron-forward" size={14} color="#E05F4E" />
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </Animated.View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Comments Preview */}

            </View>
          </ScrollView>
          </View>
        )}

        {/* FAB buttons - positioned absolutely outside scroll */}
        {!showResults && !allOptionsViewed && (
          <View style={styles.fabContainer}>
            <Animated.View style={{ transform: [{ scale: disagreeFabScale }] }}>
              <TouchableOpacity
                style={[styles.fabButton, styles.fabButtonNo]}
                onPress={swipeLeft}
                activeOpacity={0.8}
              >
                <Text style={styles.fabEmojiDown}>👎</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: agreeFabScale }] }}>
              <TouchableOpacity
                style={[styles.fabButton, styles.fabButtonYes]}
                onPress={swipeRight}
                activeOpacity={0.8}
              >
                <Text style={styles.fabEmojiUp}>👍</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
    );
  };

  const goToNextQuestion = () => {
    console.log('[DiscussionTopicsStack] Moving to next question');

    // Invalidate the unanswered query so it updates for the NEXT render
    // This is safe because we're about to move to the next question
    invalidateUnanswered(episodeId);

    if (currentQuestionIndex < topics.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentOptionIndex(0);
      setSelectedOptions([]);
      setDisagreedOptions([]);
      setExpandedResultIndex(null);
      setJustAnsweredQuestionId(null); // Clear answered state for next question
    } else {
      console.log('[DiscussionTopicsStack] All questions complete');
      onComplete();
    }
  };

  const handleResultBarPress = (index: number) => {
    if (expandedResultIndex === index) {
      // Already expanded, collapse it
      setExpandedResultIndex(null);
    } else {
      // Expand this bar
      setExpandedResultIndex(index);
      // Auto-collapse after 3 seconds
      setTimeout(() => {
        setExpandedResultIndex(null);
      }, 3000);
    }
  };

  const handleOpenComments = (topicId: string) => {
    setSelectedTopicForComments(topicId);
    setShowFullDiscussion(true);
    setDiscussionExpanded(true);
  };

  // Handle result bar animations
  useEffect(() => {
    resultAnimations.forEach((anim, index) => {
      if (expandedResultIndex === index) {
        // Slide bar out to left and numbers in from right
        Animated.parallel([
          Animated.timing(anim.barTranslateX, {
            toValue: -400,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim.numbersTranslateX, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim.numbersOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Slide bar back in and numbers out
        Animated.parallel([
          Animated.timing(anim.barTranslateX, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim.numbersTranslateX, {
            toValue: 100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim.numbersOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [expandedResultIndex, resultAnimations]);

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {renderQuestion()}

      {/* Next Question button at bottom (show when results are visible) */}
      {showResults && (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity style={styles.nextQuestionButton} onPress={goToNextQuestion}>
            <Text style={styles.nextQuestionButtonText}>
              {currentQuestionIndex < topics.length - 1 ? 'Next Question' : 'Finish'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Full Discussion Sheet */}
      {showFullDiscussion && selectedTopicForComments && (
        <DiscussionSheet
          visible={showFullDiscussion}
          expanded={discussionExpanded}
          onToggleExpand={() => {
            if (discussionExpanded) {
              // When collapsing, also hide the sheet entirely
              setDiscussionExpanded(false);
              const topicId = selectedTopicForComments;
              setTimeout(() => {
                setShowFullDiscussion(false);
                setSelectedTopicForComments(null);
                // Notify parent that discussion closed so it can refresh comments
                if (onDiscussionClose && topicId) {
                  onDiscussionClose(topicId);
                }
              }, 300);
            } else {
              setDiscussionExpanded(true);
            }
          }}
          episodeId={selectedTopicForComments}
          currentTrack={{
            title: currentTopic?.question || 'Discussion',
            artist: `Topic ${currentQuestionIndex + 1} of ${topics.length}`,
            artwork: currentTopic?.imageUrl,
          }}
          isPlaying={false}
          position={0}
          duration={0}
          onPlayPause={() => {}}
          autoFocusInput={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  scrollView: {
    flex: 1,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E5E1',
  },
  questionPage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  questionHeader: {
    height: '30%',
    backgroundColor: '#F4F1ED',
  },
  questionTouchable: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    justifyContent: 'center',
  },
  question: {
    fontSize: 28,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
    lineHeight: 36,
    marginBottom: 12,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4BFB9',
  },
  progressDotActive: {
    backgroundColor: '#E05F4E',
    width: 24,
  },
  optionsContainer: {
    height: '60%',
    position: 'relative',
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  resultsWrapper: {
    flex: 1,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsScrollContent: {
    paddingBottom: 120,
  },
  answerCard: {
    position: 'absolute',
    width: CARD_WIDTH - 32,
    height: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardImageFull: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
  },
  cardTextBubble: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  answerCardText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#403837',
    lineHeight: 24,
  },
  allDoneCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  allDoneText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#403837',
    marginTop: 16,
  },
  allDoneSubtext: {
    fontSize: 16,
    color: '#8B8680',
    marginTop: 8,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '10%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    backgroundColor: '#F4F1ED',
    zIndex: 1000,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fabButtonNo: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8E5E1',
  },
  fabButtonYes: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8E5E1',
  },
  fabEmojiUp: {
    fontSize: 32,
    marginTop: -8,
  },
  fabEmojiDown: {
    fontSize: 32,
    marginBottom: -8,
    transform: [{ scaleX: -1 }],
  },
  resultsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  resultsSection: {
    width: '100%',
    paddingTop: 10,
  },
  resultsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#403837',
    marginBottom: 20,
  },
  resultRow: {
    marginBottom: 16,
  },
  resultLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabelWithCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  resultLabelWithIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    gap: 12,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#403837',
  },
  resultLabelCentered: {
    flex: 1,
    textAlign: 'center',
  },
  resultLabelHighlight: {
    fontWeight: '700',
    color: '#E05F4E',
  },
  barAnimationContainer: {
    position: 'relative',
    height: 48,
    overflow: 'hidden',
  },
  dualBarContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentageNumbersContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  percentageNumbers: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  percentageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#403837',
  },
  barSide: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
    height: '100%',
    borderRadius: 8,
  },
  barSideDisagree: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  barSideAgree: {
    backgroundColor: '#E05F4E',
  },
  barGap: {
    width: 8,
  },
  userIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeToContinue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  swipeToContinueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E05F4E',
  },
  commentsPreview: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  commentsHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#403837',
    marginBottom: 16,
  },
  commentItem: {
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
  },
  commentTime: {
    fontSize: 12,
    color: '#8B8680',
  },
  commentText: {
    fontSize: 14,
    color: '#403837',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentLikes: {
    fontSize: 12,
    color: '#8B8680',
  },
  noComments: {
    fontSize: 14,
    color: '#8B8680',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E05F4E',
  },
  nextQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E05F4E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    marginTop: 16,
  },
  nextQuestionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  voteOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voteOverlayAgree: {
    backgroundColor: 'rgba(46, 204, 113, 0.35)', // greenish
  },
  voteOverlayDisagree: {
    backgroundColor: 'rgba(231, 76, 60, 0.35)', // reddish
  },
  voteBadge: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 16,
  },
  discussionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F8F6F3',
    borderRadius: 16,
  },
  discussionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E05F4E',
  },
  commentsAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E05F4E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  commentsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#403837',
  },
});
