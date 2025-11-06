import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import {
  useDiscussionQuestions,
  useUserDiscussionResponses,
  useClearDiscussionResponses
} from '../hooks/queries/useDiscussion';

interface PollReviewAllResultsProps {
  visible: boolean;
  onClose: () => void;
  episodeId: string;
  onJoinDiscussion?: (topicId: string) => void;
  onOpenDiscussionFlow?: () => void; // Open discussion flow to re-answer
}

export function PollReviewAllResults({
  visible,
  onClose,
  episodeId,
  onJoinDiscussion,
  onOpenDiscussionFlow,
}: PollReviewAllResultsProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  // Fetch questions and responses separately (better caching)
  const { data: questions = [], isLoading: questionsLoading } = useDiscussionQuestions(episodeId);
  const { data: responsesMap = {}, isLoading: responsesLoading } = useUserDiscussionResponses(episodeId);
  const clearResponsesMutation = useClearDiscussionResponses();

  const loading = questionsLoading || responsesLoading;

  // Track cleared questions
  const [clearedQuestions, setClearedQuestions] = useState<Set<string>>(new Set());

  // Combine questions with user responses for display
  const questionsWithResponses = useMemo(() => {
    return questions.map((question) => {
      const responses = responsesMap[question.id] || { agreed: [], disagreed: [] };

      return {
        questionId: question.id,
        question: question.question,
        options: question.options.map((option) => ({
          value: option.value,
          label: option.label,
          userAgreed: responses.agreed.includes(option.value),
          userDisagreed: responses.disagreed.includes(option.value),
          agreePercentage: 50, // TODO: Add stats if needed
          disagreePercentage: 50, // TODO: Add stats if needed
        })),
      };
    });
  }, [questions, responsesMap]);

  const [expandedResults, setExpandedResults] = useState<Record<string, number | null>>({});

  // Clean up when modal closes
  useEffect(() => {
    if (!visible) {
      setClearedQuestions(new Set());
    }
  }, [visible]);

  const handleResultBarPress = (questionId: string, optionIndex: number) => {
    const currentExpanded = expandedResults[questionId];

    if (currentExpanded === optionIndex) {
      // Collapse
      setExpandedResults((prev) => ({ ...prev, [questionId]: null }));
    } else {
      // Expand this bar
      setExpandedResults((prev) => ({ ...prev, [questionId]: optionIndex }));
    }
  };

  const handleClearAnswers = async (questionId: string) => {
    console.log('[PollReviewAllResults] Clearing answers for question:', questionId);

    // Just swap immediately
    setClearedQuestions((prev) => new Set(prev).add(questionId));

    // Clear responses in background (non-blocking)
    clearResponsesMutation.mutateAsync({ questionId, episodeId }).catch((error) => {
      console.error('Failed to clear answers:', error);
    });
  };

  const handleRedoAnswers = () => {
    // Close this sheet and open discussion flow
    onClose();
    setTimeout(() => {
      if (onOpenDiscussionFlow) {
        onOpenDiscussionFlow();
      }
    }, 100);
  };

  const handleClearAll = async () => {
    console.log('[PollReviewAllResults] Clearing all answers');

    // Clear all responses in background (non-blocking)
    Promise.all(
      questionsWithResponses.map((question) =>
        clearResponsesMutation.mutateAsync({ questionId: question.questionId, episodeId })
      )
    ).catch((error) => {
      console.error('Failed to clear all answers:', error);
    });

    // Close the sheet immediately
    onClose();
  };

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#E05F4E" />
          <Text style={styles.loadingText}>Loading poll results...</Text>
        </View>
      </Modal>
    );
  }

  if (questionsWithResponses.length === 0 && !loading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.emptyTitle}>No Results Yet</Text>
          <Text style={styles.emptyText}>
            No poll results are available for this episode.
          </Text>
          <TouchableOpacity style={styles.closeButtonAction} onPress={onClose}>
            <Text style={styles.closeButtonActionText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Poll Results</Text>
            {questionsWithResponses.some((q) => q.options.some((opt) => opt.userAgreed || opt.userDisagreed)) && (
              <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
                <Ionicons name="trash-outline" size={18} color="#E05F4E" />
                <Text style={styles.clearAllButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={32} color="#403837" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {questionsWithResponses.map((question, questionIndex) => {
            const expandedOptionIndex = expandedResults[question.questionId];

            return (
              <View
                key={question.questionId}
                style={styles.questionSection}
              >
                {/* Question Header */}
                <View style={styles.questionHeader}>
                  <View style={styles.questionHeaderTop}>
                    <Text style={styles.questionNumber}>Question {questionIndex + 1}</Text>
                    {!clearedQuestions.has(question.questionId) && question.options.some((opt) => opt.userAgreed || opt.userDisagreed) && (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => handleClearAnswers(question.questionId)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#E05F4E" />
                        <Text style={styles.clearButtonText}>Clear answers</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.questionText}>{question.question}</Text>
                </View>

                {/* Simple conditional render - no animation */}
                {clearedQuestions.has(question.questionId) ? (
                  <View style={styles.redoContainer}>
                    <TouchableOpacity
                      style={styles.redoButton}
                      onPress={handleRedoAnswers}
                    >
                      <Ionicons name="refresh" size={20} color="#FFFFFF" />
                      <Text style={styles.redoButtonText}>Redo answers</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.resultsSection}>
                  {question.options.map((option, optionIdx) => {
                    const isExpanded = expandedOptionIndex === optionIdx;

                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={styles.resultRow}
                        onPress={() => handleResultBarPress(question.questionId, optionIdx)}
                        activeOpacity={0.7}
                      >
                        {/* Option Label */}
                        <View style={styles.resultLabelRow}>
                          <View style={styles.resultLabelWithIcons}>
                            <Ionicons
                              name="close-circle"
                              size={16}
                              color={option.userDisagreed ? '#E05F4E' : '#C4BFB9'}
                            />
                            <Text
                              style={[
                                styles.resultLabel,
                                styles.resultLabelCentered,
                                (option.userAgreed || option.userDisagreed) &&
                                  styles.resultLabelHighlight,
                              ]}
                            >
                              {option.label}
                            </Text>
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color={option.userAgreed ? '#E05F4E' : '#C4BFB9'}
                            />
                          </View>
                        </View>

                        {/* Bar Container */}
                        <View style={styles.barContainer}>
                          {!isExpanded ? (
                            // Dual-sided Bar
                            <View style={styles.dualBarContainer}>
                              {/* Disagree bar (left) */}
                              <View
                                style={[
                                  styles.barSide,
                                  styles.barSideDisagree,
                                  { flex: option.disagreePercentage || 0.1 },
                                ]}
                              >
                                {option.disagreePercentage >= 10 && (
                                  <Ionicons name="close" size={24} color="#E05F4E" />
                                )}
                              </View>

                              {/* Gap */}
                              <View style={styles.barGap} />

                              {/* Agree bar (right) */}
                              <View
                                style={[
                                  styles.barSide,
                                  styles.barSideAgree,
                                  { flex: option.agreePercentage || 0.1 },
                                ]}
                              >
                                {option.agreePercentage >= 10 && (
                                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                                )}
                              </View>
                            </View>
                          ) : (
                            // Expanded view with percentages
                            <View style={styles.expandedContainer}>
                              <View style={styles.statsRow}>
                                <View style={styles.percentageNumbers}>
                                  <View style={styles.percentageItem}>
                                    <Ionicons name="close" size={16} color="#E05F4E" />
                                    <Text style={styles.percentageText}>
                                      {option.disagreePercentage.toFixed(0)}%
                                    </Text>
                                  </View>
                                  <View style={styles.percentageItem}>
                                    <Ionicons name="checkmark" size={16} color="#E05F4E" />
                                    <Text style={styles.percentageText}>
                                      {option.agreePercentage.toFixed(0)}%
                                    </Text>
                                  </View>
                                </View>

                                {/* Discussion Button */}
                                {onJoinDiscussion && (
                                  <TouchableOpacity
                                    style={styles.discussionButton}
                                    onPress={() => onJoinDiscussion(question.questionId)}
                                  >
                                    <Ionicons
                                      name="chatbubble-outline"
                                      size={16}
                                      color="#E05F4E"
                                    />
                                    <Text style={styles.discussionButtonText}>Discuss</Text>
                                    <Ionicons
                                      name="chevron-forward"
                                      size={14}
                                      color="#E05F4E"
                                    />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#F4F1ED',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#E05F4E',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF5F4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E05F4E',
  },
  clearAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E05F4E',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#403837',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingBottom: 40,
  },
  questionSection: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  questionHeader: {
    marginBottom: 20,
  },
  questionHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E05F4E',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF5F4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E05F4E',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E05F4E',
  },
  questionText: {
    fontSize: 24,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
    lineHeight: 32,
  },
  resultsSection: {
    width: '100%',
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
  barContainer: {
    height: 48,
  },
  dualBarContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedContainer: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#F8F6F3',
    borderRadius: 8,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#E05F4E',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#8B8680',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  closeButtonAction: {
    backgroundColor: '#E05F4E',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeButtonActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  redoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    width: '100%',
  },
  redoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E05F4E',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  redoButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
