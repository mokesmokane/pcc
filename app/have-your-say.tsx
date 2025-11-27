import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';
import { DiscussionFlow } from './components/DiscussionFlow';
import { DiscussionSheet } from './components/player/DiscussionSheet';
import { CommentsList } from './components/player/CommentsList';
import { useWeeklySelections } from './contexts/WeeklySelectionsContext';
import { useComments } from './contexts/CommentsContext';
import { useConversationStarters, useStarterComments, useAddStarterComment } from './hooks/queries/useConversationStarters';
import { usePollProgress } from './hooks/queries/useDiscussion';
import { useIsPlaying, usePosition, useDuration } from './stores/audioStore.hooks';
import { useAudioStore } from './stores/useAudioStore';
import { useCurrentPodcastStore } from './stores/currentPodcastStore';
import { styles } from './styles/have-your-say.styles';

export default function HaveYourSayScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ PaytoneOne_400Regular });

  // State
  const [showDiscussionFlow, setShowDiscussionFlow] = useState(false);
  const [showDiscussionSheet, setShowDiscussionSheet] = useState(false);
  const [discussionExpanded, setDiscussionExpanded] = useState(false);
  const [selectedStarterId, setSelectedStarterId] = useState<string | null>(null);
  const [selectedStarterQuestion, setSelectedStarterQuestion] = useState<string>('');

  // Get current podcast using the same logic as CurrentPodcastSection
  const { userChoices } = useWeeklySelections();
  const currentPodcastId = useCurrentPodcastStore((state) => state.currentPodcastId);

  // Find the current podcast from user's choices (same logic as CurrentPodcastSection)
  const currentPodcast = currentPodcastId && userChoices.length > 0
    ? userChoices.find((p) => p.id === currentPodcastId) || userChoices[0]
    : userChoices[0];

  const episodeId = currentPodcast?.id || '';

  // Audio store for mini player in discussion sheet
  const isPlaying = useIsPlaying();
  const position = usePosition();
  const duration = useDuration();
  const togglePlayPause = useAudioStore((state) => state.togglePlayPause);
  const skipBackward = useAudioStore((state) => state.skipBackward);

  // Conversation starters data
  const { data: starters = [], isLoading: startersLoading } = useConversationStarters(episodeId);

  // Episode comments data
  const { comments, loadComments, submitComment, addReaction, getReactionDetails, getReplies } = useComments();

  // Poll progress
  const { data: pollProgress } = usePollProgress(episodeId);

  // Starter comments (when a starter is selected)
  const { data: starterComments = [] } = useStarterComments(selectedStarterId || '');
  const addStarterCommentMutation = useAddStarterComment();

  // Load episode comments when episodeId changes
  useEffect(() => {
    if (episodeId) {
      loadComments(episodeId);
    }
  }, [episodeId, loadComments]);

  // Format starter comments for CommentsList
  const formattedStarterComments = useMemo(() => {
    return starterComments.map((comment: any) => ({
      id: comment.id,
      author: comment.username || 'Anonymous',
      avatar: comment.avatarUrl,
      text: comment.content,
      time: formatTimeAgo(comment.createdAt),
      reactions: [],
      replies: 0,
    }));
  }, [starterComments]);

  // Handlers
  const handleStarterPress = useCallback((starterId: string, question: string) => {
    setSelectedStarterId(starterId);
    setSelectedStarterQuestion(question);
    setShowDiscussionSheet(true);
    setDiscussionExpanded(true);
  }, []);

  const handlePollPress = useCallback(() => {
    setShowDiscussionFlow(true);
  }, []);

  const handleViewAllComments = useCallback(() => {
    setSelectedStarterId(null);
    setSelectedStarterQuestion('');
    setShowDiscussionSheet(true);
    setDiscussionExpanded(true);
  }, []);

  const handleToggleDiscussionExpand = useCallback(() => {
    if (discussionExpanded) {
      setShowDiscussionSheet(false);
      setDiscussionExpanded(false);
      setSelectedStarterId(null);
      setSelectedStarterQuestion('');
    } else {
      setDiscussionExpanded(true);
    }
  }, [discussionExpanded]);

  const handleSubmitComment = useCallback(async (content: string) => {
    if (!episodeId) return;

    if (selectedStarterId) {
      // Submit comment to starter
      await addStarterCommentMutation.mutateAsync({
        starterId: selectedStarterId,
        episodeId,
        content,
      });
    } else {
      // Submit regular episode comment
      await submitComment(episodeId, content);
    }
  }, [episodeId, selectedStarterId, addStarterCommentMutation, submitComment]);

  const handleOpenComments = useCallback((_topicId: string) => {
    // Called when poll wants to open comments - we'll just close the poll
    setShowDiscussionFlow(false);
  }, []);

  // Loading state
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
        </View>
      </SafeAreaView>
    );
  }

  // No episode selected
  if (!episodeId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="musical-notes-outline" size={64} color="#C4C1BB" />
          <Text style={styles.loadingText}>Select an episode first</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPollCompleted = pollProgress?.isCompleted || false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with back button and podcast info */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color="#403837" />
        </TouchableOpacity>
        {currentPodcast?.image && (
          <Image
            source={{ uri: currentPodcast.image }}
            style={styles.headerImage}
          />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentPodcast?.source || currentPodcast?.episode}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {currentPodcast?.title}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Have your say</Text>
          <Text style={styles.subtitle}>
            Join the conversation, share your thoughts, and see what others think
          </Text>
        </View>

        {/* Conversation Starters Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversation starters</Text>
          {startersLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color="#E05F4E" />
            </View>
          ) : starters.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={28} color="#E05F4E" />
              </View>
              <Text style={styles.emptyText}>No conversation starters yet</Text>
            </View>
          ) : (
            starters.map(({ starter, commentCount }) => (
              <TouchableOpacity
                key={starter.id}
                style={styles.starterCard}
                onPress={() => handleStarterPress(starter.id, starter.question)}
                activeOpacity={0.7}
              >
                <View style={styles.starterCardContent}>
                  <Text style={styles.starterQuestion}>{starter.question}</Text>
                  <View style={styles.starterMeta}>
                    <Ionicons name="chatbubble-outline" size={14} color="#8B8680" />
                    <Text style={styles.starterCommentCount}>
                      {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                    </Text>
                  </View>
                </View>
                <View style={styles.starterIcon}>
                  <Ionicons name="chevron-forward" size={20} color="#E05F4E" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Take the Poll Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Take the poll</Text>
          <TouchableOpacity
            style={styles.pollButton}
            onPress={handlePollPress}
            activeOpacity={0.8}
          >
            <Ionicons name="bar-chart-outline" size={24} color="#FFFFFF" />
            <Text style={styles.pollButtonText}>
              {isPollCompleted ? 'Review your answers' : 'Answer poll questions'}
            </Text>
          </TouchableOpacity>
          {pollProgress && pollProgress.totalQuestions > 0 && (
            <Text style={[styles.emptyText, { marginTop: 8 }]}>
              {pollProgress.completedCount} of {pollProgress.totalQuestions} questions answered
            </Text>
          )}
        </View>

        {/* Comments Preview Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent comments</Text>
            <TouchableOpacity onPress={handleViewAllComments}>
              <Text style={styles.viewAllLink}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.commentsPreviewContainer}>
            <CommentsList
              comments={comments.slice(0, 3)}
              maxComments={3}
              scrollable={false}
              onReply={() => handleViewAllComments()}
              onReact={(commentId, emoji) => addReaction(commentId, emoji)}
              onFetchReactionDetails={getReactionDetails}
              contentPadding={0}
            />
            {comments.length === 0 && (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="chatbubble-outline" size={28} color="#E05F4E" />
                </View>
                <Text style={styles.emptyText}>Be the first to comment</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Discussion Flow Modal (Poll) */}
      <DiscussionFlow
        visible={showDiscussionFlow}
        onClose={() => setShowDiscussionFlow(false)}
        episodeId={episodeId}
        onOpenComments={handleOpenComments}
      />

      {/* Discussion Sheet (Comments) */}
      {showDiscussionSheet && (
        <DiscussionSheet
          visible={showDiscussionSheet}
          expanded={discussionExpanded}
          onToggleExpand={handleToggleDiscussionExpand}
          episodeId={selectedStarterId || episodeId}
          currentTrack={{
            title: selectedStarterQuestion || currentPodcast?.title,
            artist: selectedStarterQuestion ? 'Conversation Starter' : currentPodcast?.source,
            artwork: currentPodcast?.image,
          }}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          onPlayPause={togglePlayPause}
          onSkipBackward={skipBackward}
          autoFocusInput={false}
        />
      )}
    </SafeAreaView>
  );
}

// Helper function to format time ago
function formatTimeAgo(date: Date | number): string {
  const now = new Date();
  const then = date instanceof Date ? date : new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}
