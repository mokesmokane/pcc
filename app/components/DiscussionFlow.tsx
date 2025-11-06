import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DiscussionTopicsStack } from './DiscussionTopicsStack';
import type { DiscussionTopic, TopicComment } from './DiscussionTopicsStack';
import { useAuth } from '../contexts/AuthContext';
import { useComments } from '../contexts/CommentsContext';
import { useUnansweredQuestions } from '../hooks/queries/useDiscussion';

interface DiscussionFlowProps {
  visible: boolean;
  onClose: () => void;
  episodeId: string;
  onOpenComments: (topicId: string) => void;
}

export function DiscussionFlow({
  visible,
  onClose,
  episodeId,
  onOpenComments: _onOpenComments,
}: DiscussionFlowProps) {
  const [topicComments, setTopicComments] = useState<Record<string, TopicComment[]>>({});
  // Capture initial topics snapshot when modal opens
  const [initialTopics, setInitialTopics] = useState<DiscussionTopic[]>([]);
  const hasCapturedRef = useRef(false);

  const { user } = useAuth();
  const { getCommentsForEpisode } = useComments();

  // Fetch unanswered questions directly using React Query
  const { data: unansweredQuestions = [], isLoading: loading } = useUnansweredQuestions(episodeId);

  // Format as topics for DiscussionTopicsStack - memoized to prevent unnecessary recalculations
  const latestTopics: DiscussionTopic[] = useMemo(() => {
    if (!visible || !user) return [];

    return unansweredQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      questionType: q.questionType,
      imageUrl: q.imageUrl || undefined,
      options: q.options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        emoji: opt.emoji || undefined,
        imageUrl: opt.imageUrl || undefined,
      })),
    }));
  }, [visible, user, unansweredQuestions]);

  // Capture initial topics when modal opens (ONCE only!)
  useEffect(() => {
    if (visible && !loading && latestTopics.length > 0 && !hasCapturedRef.current) {
      console.log('[DiscussionFlow] Capturing initial topics snapshot:', latestTopics.length);
      setInitialTopics(latestTopics);
      hasCapturedRef.current = true;
    }
  }, [visible, loading, latestTopics]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setTopicComments({});
      setInitialTopics([]); // Reset snapshot for next open
      hasCapturedRef.current = false; // Reset capture flag
    }
  }, [visible]);

  // Load comments for all topics when topics change (reactive)
  useEffect(() => {
    if (!visible || initialTopics.length === 0) return;

    const loadAllTopicComments = async () => {
      const commentsData: Record<string, TopicComment[]> = {};

      for (const topic of initialTopics) {
        try {
          // Get comments for this topic (using topic.id as episodeId)
          const topicCommentsList = await getCommentsForEpisode(topic.id, null);

          // Format comments to match TopicComment interface
          commentsData[topic.id] = topicCommentsList.map(comment => ({
            id: comment.id,
            userId: '', // Not in CommentData - would need to add if needed
            userName: comment.author,
            userAvatar: comment.avatar,
            comment: comment.text,
            createdAt: new Date(), // Time string would need parsing
            likesCount: comment.reactions?.reduce((sum, r) => sum + r.count, 0) || 0,
          }));
        } catch (error) {
          console.error(`Failed to load comments for topic ${topic.id}:`, error);
          commentsData[topic.id] = [];
        }
      }

      setTopicComments(commentsData);
    };

    loadAllTopicComments();
  }, [getCommentsForEpisode, visible, initialTopics]);

  const handleComplete = useCallback(() => {
    // All cards swiped through - close modal
    onClose();
  }, [onClose]);

  // Get actual comments from database
  const getComments = useCallback((topicId: string): TopicComment[] => {
    return topicComments[topicId] || [];
  }, [topicComments]);

  const handleAddComment = useCallback((topicId: string, comment: string) => {
    // In production, save to database
    console.log('Adding comment:', { topicId, comment });
  }, []);

  // Reload comments for a specific topic
  const handleDiscussionClose = useCallback(async (topicId: string) => {
    try {
      // Reload comments for this topic
      const topicCommentsList = await getCommentsForEpisode(topicId, null);

      const formattedComments = topicCommentsList.map(comment => ({
        id: comment.id,
        userId: '', // Not in CommentData
        userName: comment.author,
        userAvatar: comment.avatar,
        comment: comment.text,
        createdAt: new Date(), // Time string would need parsing
        likesCount: comment.reactions?.reduce((sum, r) => sum + r.count, 0) || 0,
      }));

      // Update only this topic's comments
      setTopicComments(prev => ({
        ...prev,
        [topicId]: formattedComments,
      }));
    } catch (error) {
      console.error(`Failed to reload comments for topic ${topicId}:`, error);
    }
  }, [getCommentsForEpisode]);

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
          <Text style={styles.loadingText}>Loading discussion questions...</Text>
        </View>
      </Modal>
    );
  }

  if (initialTopics.length === 0 && !loading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View style={[styles.container, styles.loadingContainer]}>
          <Text style={styles.emptyTitle}>All Done! 🎉</Text>
          <Text style={styles.emptyText}>
            You&apos;ve answered all the discussion questions for this episode.
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
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
        <DiscussionTopicsStack
          episodeId={episodeId}
          topics={initialTopics}
          onComplete={handleComplete}
          getComments={getComments}
          onAddComment={handleAddComment}
          onDiscussionClose={handleDiscussionClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#403837',
    textAlign: 'center',
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
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: '#E05F4E',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
