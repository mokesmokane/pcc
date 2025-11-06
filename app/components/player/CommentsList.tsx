import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Comment } from './Comment';
import { Ionicons } from '@expo/vector-icons';

interface Reaction {
  emoji: string;
  count: number;
  userReacted?: boolean;
}

interface CommentData {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  time: string;
  reactions?: Reaction[];
  replies?: number;
  replyAvatars?: string[];
}

interface CommentsListProps {
  comments: CommentData[];
  maxComments?: number;
  scrollable?: boolean;
  onReply?: (comment: CommentData) => void;
  onReact?: (commentId: string, emoji: string) => void;
  onMore?: (commentId: string) => void;
  onFetchReactionDetails?: (commentId: string) => Promise<Array<{ id: string; userName: string; avatar?: string; emoji: string }>>;
  contentPadding?: number;
  onViewReplies?: (comment: CommentData) => void;
  onFetchReplies?: (commentId: string) => Promise<Array<{ id: string; author: string; avatar?: string; text: string; time: string }>>;
}

export function CommentsList({
  comments,
  maxComments,
  scrollable = true,
  onReply,
  onReact,
  onMore,
  onFetchReactionDetails,
  contentPadding = 20,
  onViewReplies,
  onFetchReplies,
}: CommentsListProps) {
  // Limit comments if maxComments is specified
  const displayComments = maxComments ? comments.slice(0, maxComments) : comments;

  // Collect all participant names from the thread
  const threadParticipants = comments.map(comment => comment.author);

  // Show empty state if no comments
  if (comments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="chatbubble-outline" size={48} color="#E05F4E" />
        </View>
        <Text style={styles.emptyTitle}>Start the conversation</Text>
        <Text style={styles.emptySubtitle}>
          Be the first to share your thoughts on this episode
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: contentPadding }
      ]}
      scrollEnabled={scrollable}
    >
      {displayComments.map((comment, index) => (
        <Comment
          key={comment.id}
          id={comment.id}
          author={comment.author}
          avatar={comment.avatar}
          text={comment.text}
          time={comment.time}
          reactions={comment.reactions}
          replies={comment.replies}
          replyAvatars={comment.replyAvatars}
          isFirst={index === 0}
          onReply={() => onReply?.(comment)}
          onReact={(emoji) => onReact?.(comment.id, emoji)}
          onMore={() => onMore?.(comment.id)}
          onFetchReactionDetails={() => onFetchReactionDetails?.(comment.id)}
          threadParticipants={threadParticipants}
          onViewReplies={() => onViewReplies?.(comment)}
          onFetchReplies={() => onFetchReplies?.(comment.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    // Default padding, will be overridden by contentPadding prop
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    lineHeight: 20,
  },
});