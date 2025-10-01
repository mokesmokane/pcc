import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CommentRepository } from '../data/repositories/comment.repository';
import Comment from '../data/models/comment.model';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';

interface CommentData {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  time: string;
  reactions?: Array<{ emoji: string; count: number; userReacted?: boolean }>;
  replies?: number;
  replyAvatars?: string[]; // URLs of avatars from users who replied
}

interface CommentsContextType {
  comments: CommentData[];
  loading: boolean;
  error: string | null;
  loadComments: (episodeId: string) => Promise<void>;
  submitComment: (episodeId: string, content: string, parentId?: string) => Promise<void>;
  addReaction: (commentId: string, emoji: string) => Promise<void>;
  removeReaction: (commentId: string, emoji: string) => Promise<void>;
  getReactionDetails: (commentId: string) => Promise<any[]>;
  getReplies: (episodeId: string, parentId: string) => Promise<CommentData[]>;
}

const CommentsContext = createContext<CommentsContextType | undefined>(undefined);

export function CommentsProvider({ children }: { children: ReactNode }) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);

  const { user } = useAuth();
  const { database } = useDatabase();
  const [commentRepository, setCommentRepository] = useState<CommentRepository | null>(null);

  // Initialize repository
  useEffect(() => {
    if (database) {
      setCommentRepository(new CommentRepository(database));
    }
  }, [database]);

  // Subscribe to comments for current episode
  useEffect(() => {
    if (!commentRepository || !currentEpisodeId) return;

    let commentsCache: Comment[] = [];

    const refreshComments = async () => {
      // Get latest top-level comments only (parentId = null)
      const dbComments = commentsCache.length > 0 ? commentsCache :
        await commentRepository.getEpisodeComments(currentEpisodeId, null);

      // Format comments with reactions and reply count
      const formattedComments: CommentData[] = await Promise.all(
        dbComments.map(async (comment) => {
          // Get reactions for this comment
          const reactions = await commentRepository.getReactions(comment.id, user?.id);

          // Get replies to determine count and avatars
          const replies = await commentRepository.getEpisodeComments(currentEpisodeId, comment.id);
          const replyCount = replies.length;

          // Get reply avatars (up to 3)
          const replyAvatars = replies
            .slice(0, 3)
            .map(reply => reply.avatarUrl)
            .filter(avatar => avatar != null) as string[];

          return {
            id: comment.id,
            author: comment.username || 'Anonymous',
            avatar: comment.avatarUrl,
            text: comment.content,
            time: formatTimeAgo(comment.createdAt),
            reactions: reactions,
            replies: replyCount || 0,
            replyAvatars: replyAvatars,
          };
        })
      );
      setComments(formattedComments);
    };

    // Subscribe to top-level comments only
    const subscription = commentRepository.observeEpisodeComments(currentEpisodeId, null).subscribe(
      async (dbComments) => {
        commentsCache = dbComments;
        await refreshComments();
      }
    );

    // Also subscribe to reactions changes
    const reactionsSubscription = commentRepository.observeAllReactionsForEpisode(currentEpisodeId).subscribe(
      async () => {
        // When reactions change, refresh the comments to show updated counts
        await refreshComments();
      }
    );

    return () => {
      subscription.unsubscribe();
      reactionsSubscription.unsubscribe();
    };
  }, [commentRepository, currentEpisodeId, user]);

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  };

  const loadComments = async (episodeId: string) => {
    if (!commentRepository) {
      return;
    }

    if (!episodeId) {
      return;
    }

    setCurrentEpisodeId(episodeId);
    setLoading(true);
    setError(null);

    try {
      await commentRepository.syncWithRemote(episodeId);
    } catch (err) {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (episodeId: string, content: string, parentId?: string) => {
    if (!commentRepository || !user) {
      setError('Not authenticated');
      return;
    }

    try {
      await commentRepository.createComment(episodeId, user.id, content, parentId);
    } catch (err) {
      setError('Failed to submit comment');
      throw err;
    }
  };

  const addReaction = async (commentId: string, emoji: string) => {
    if (!commentRepository || !user) {
      setError('Not authenticated');
      return;
    }

    try {
      const added = await commentRepository.toggleReaction(commentId, user.id, emoji);
    } catch (err) {
      setError('Failed to toggle reaction');
    }
  };

  const removeReaction = async (commentId: string, emoji: string) => {
    // This is the same as addReaction since we use toggle
    await addReaction(commentId, emoji);
  };

  const getReactionDetails = async (commentId: string): Promise<any[]> => {
    if (!commentRepository) {
      return [];
    }

    try {
      return await commentRepository.getReactionDetails(commentId);
    } catch (err) {
      console.error('Failed to get reaction details:', err);
      return [];
    }
  };

  const getReplies = async (episodeId: string, parentId: string): Promise<CommentData[]> => {
    if (!commentRepository) {
      return [];
    }

    try {
      // Get replies for this parent comment
      const replies = await commentRepository.getEpisodeComments(episodeId, parentId);

      // Format replies with reactions
      const formattedReplies: CommentData[] = await Promise.all(
        replies.map(async (reply) => {
          const reactions = await commentRepository.getReactions(reply.id, user?.id);

          return {
            id: reply.id,
            author: reply.username || 'Anonymous',
            avatar: reply.avatarUrl,
            text: reply.content,
            time: formatTimeAgo(reply.createdAt),
            reactions: reactions,
            replies: 0, // Replies don't have nested replies for now
          };
        })
      );

      return formattedReplies;
    } catch (err) {
      console.error('Failed to get replies:', err);
      return [];
    }
  };

  const value: CommentsContextType = {
    comments,
    loading,
    error,
    loadComments,
    submitComment,
    addReaction,
    removeReaction,
    getReactionDetails,
    getReplies,
  };

  return (
    <CommentsContext.Provider value={value}>
      {children}
    </CommentsContext.Provider>
  );
}

export function useComments() {
  const context = useContext(CommentsContext);
  if (context === undefined) {
    throw new Error('useComments must be used within a CommentsProvider');
  }
  return context;
}