import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from './MiniPlayer';
import { CommentsHeader } from './CommentsHeader';
import { CommentsList } from './CommentsList';
import { CommentsInputBar } from './CommentsInputBar';
import { ReplySheet } from './ReplySheet';
import { useComments } from '../../contexts/CommentsContext';

interface DiscussionSheetProps {
  visible: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  episodeId?: string;
  currentTrack?: {
    title?: string;
    artist?: string;
    artwork?: string;
  };
  isPlaying: boolean;
  position: number;
  duration: number;
  onPlayPause: () => void;
  onSkipBackward?: () => void;
  autoFocusInput?: boolean;
}

export function DiscussionSheet({
  _visible,
  expanded,
  onToggleExpand,
  episodeId,
  currentTrack,
  isPlaying,
  position,
  duration,
  onPlayPause,
  onSkipBackward,
  autoFocusInput = false,
}: DiscussionSheetProps) {
  const insets = useSafeAreaInsets();
  const discussionAnimatedValue = useRef(new Animated.Value(0)).current; // Start collapsed
  const discussionTranslateY = useRef(new Animated.Value(0)).current;
  const { comments, loadComments, submitComment, addReaction, getReplies } = useComments();
  const [showReplySheet, setShowReplySheet] = useState(false);
  const [selectedComment, setSelectedComment] = useState<{ id: string; author: string; text: string } | null>(null);
  const [replies, setReplies] = useState<Array<{ id: string; author: string; avatar?: string; text: string; time: string }>>([]);

  // Load comments when episode changes
  useEffect(() => {
    if (episodeId) {
      loadComments(episodeId);
    }
  }, [episodeId, loadComments]);

  // Load replies when a comment is selected
  useEffect(() => {
    if (selectedComment && episodeId) {
      getReplies(episodeId, selectedComment.id)
        .then(setReplies);
    }
  }, [selectedComment, episodeId, getReplies]);

  const discussionPanResponder = useRef(
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
        // Handle dragging
        discussionTranslateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const shouldToggle = expanded
          ? gestureState.dy > 100 // Need to drag down 100px to dismiss
          : gestureState.dy < -100; // Need to drag up 100px to expand

        if (shouldToggle) {
          // Toggle the state
          onToggleExpand();
          // Reset the translate
          Animated.spring(discussionTranslateY, {
            toValue: 0,
            friction: 8,
            useNativeDriver: true,
          }).start();
        } else {
          // Spring back to current position
          Animated.spring(discussionTranslateY, {
            toValue: 0,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  React.useEffect(() => {
    Animated.timing(discussionAnimatedValue, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [expanded, discussionAnimatedValue]);

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <>
      {/* MiniPlayer - Shows at top when expanded */}
      <Animated.View
        style={[
          styles.miniPlayerOverlay,
          {
            opacity: discussionAnimatedValue,
            transform: [
              {
                translateY: discussionAnimatedValue.interpolate({
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

      {/* Discussion Panel - Always there, slides up/down */}
      <Animated.View
        style={[
          styles.discussionPanelOverlay,
          {
            transform: [
              {
                translateY: Animated.add(
                  discussionAnimatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [680, 0], // Docked: shows top of comments card, Expanded: fully visible
                  }),
                  discussionTranslateY
                ),
              },
            ],
          },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={[styles.container, { paddingTop: insets.top + 64 }]}>
            <View style={styles.commentsContainer}>
              {/* Comments Header with drag handlers */}
              <CommentsHeader
                commentCount={comments.length}
                showDismiss={expanded}
                onDismiss={onToggleExpand}
                dragHandlers={discussionPanResponder.panHandlers}
              />

              {/* Comments List */}
              <CommentsList
              comments={comments}
              scrollable={true}
              contentPadding={0}
              onReply={(comment) => {
                setSelectedComment(comment);
                setShowReplySheet(true);
              }}
              onReact={async (commentId, emoji) => {
                await addReaction(commentId, emoji);
              }}
              onViewReplies={(comment) => {
                setSelectedComment(comment);
                setShowReplySheet(true);
              }}
              onFetchReplies={async (commentId) => {
                if (episodeId) {
                  return await getReplies(episodeId, commentId);
                }
                return [];
              }}
            />
            </View>

            {/* Comment Input Bar */}
            <CommentsInputBar
              onSubmit={async (text) => {
                if (episodeId) {
                  await submitComment(episodeId, text);
                }
              }}
              autoFocus={autoFocusInput}
              includeBottomPadding
            />
          </View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Reply Sheet */}
      <ReplySheet
        visible={showReplySheet}
        onClose={() => {
          setShowReplySheet(false);
          setSelectedComment(null);
          setReplies([]);
        }}
        parentComment={selectedComment}
        replies={replies}
        onSubmitReply={async (text) => {
          if (episodeId && selectedComment) {
            // Submit as a reply by passing the parent comment ID
            await submitComment(episodeId, text, selectedComment.id);
            // Reload replies after submission
            const newReplies = await getReplies(episodeId, selectedComment.id);
            setReplies(newReplies);
          }
        }}
        onReact={async (commentId, emoji) => {
          await addReaction(commentId, emoji);
        }}
      />
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
  discussionPanelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  commentsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  keyboardAvoid: {
    flex: 1,
  },
});