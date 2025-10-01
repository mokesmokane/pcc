import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { CommentsHeader } from './CommentsHeader';
import { CommentsList } from './CommentsList';
import { CommentsInputBar } from './CommentsInputBar';
import { useComments } from '../../contexts/CommentsContext';

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

interface CommentsSectionProps {
  episodeId?: string;
  maxComments?: number;
  onSubmitComment?: (text: string) => Promise<void>;
  onReply?: (comment: CommentData) => void;
  onReact?: (commentId: string, emoji: string) => void;
  onMore?: (commentId: string) => void;
  onViewAll?: () => void;
  onInputPress?: () => void;
  onViewReplies?: (comment: CommentData) => void;
  onFetchReplies?: (commentId: string) => Promise<any[]>;
}

/**
 * CommentsSection - Used in the player screen
 * Combines header, list, and input components
 */
export function CommentsSection({
  episodeId,
  maxComments,
  onSubmitComment,
  onReply,
  onReact,
  onMore,
  onViewAll,
  onInputPress,
  onViewReplies,
  onFetchReplies,
}: CommentsSectionProps) {
  const { comments, loadComments, submitComment, addReaction, getReactionDetails, getReplies } = useComments();

  // Load comments when episode changes
  useEffect(() => {
    if (episodeId) {
      loadComments(episodeId);
    }
  }, [episodeId]);

  const handleSubmit = async (text: string) => {
    if (onSubmitComment) {
      await onSubmitComment(text);
    } else if (episodeId) {
      await submitComment(episodeId, text);
    }
  };

  const handleReact = async (commentId: string, emoji: string) => {
    if (onReact) {
      onReact(commentId, emoji);
    } else {
      await addReaction(commentId, emoji);
    }
  };

  const handleFetchReactionDetails = async (commentId: string) => {
    return await getReactionDetails(commentId);
  };

  // Use real comments if available, otherwise show defaults
  const displayComments = comments;

  // Show "View all" when we have maxComments set (meaning we're in limited view)
  // and there's a handler for it
  const showViewAll = !!(maxComments && onViewAll);

  return (
    <View style={styles.container}>
      <CommentsHeader
        commentCount={displayComments.length}
        showViewAll={showViewAll}
        onViewAll={onViewAll}
      />

      <CommentsList
        comments={displayComments}
        maxComments={maxComments}
        scrollable={!maxComments}
        onReply={onReply}
        onReact={handleReact}
        onMore={onMore}
        onFetchReactionDetails={handleFetchReactionDetails}
        onViewReplies={onViewReplies}
        onFetchReplies={onFetchReplies || (async (commentId) => {
          if (episodeId) {
            return await getReplies(episodeId, commentId);
          }
          return [];
        })}
        contentPadding={20} // Small padding for input bar
      />

      <CommentsInputBar
        onSubmit={handleSubmit}
        onInputPress={onInputPress}
        readOnly={!!onInputPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
});