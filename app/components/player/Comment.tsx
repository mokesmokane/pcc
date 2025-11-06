import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ReactionPicker } from './ReactionPicker';
import { ReactionDetailsModal } from './ReactionDetailsModal';

// Component to render text with styled @mentions
const MentionText = ({ text, style, validUsernames = [] }: { text: string; style?: object; validUsernames?: string[] }) => {
  // Split text by @mentions pattern
  const parts = text.split(/(@\w+)/g);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          // Remove @ and check if this username exists in the thread
          const username = part.substring(1).toLowerCase();
          const isValidMention = validUsernames.some(
            validUsername => validUsername.toLowerCase().replace(/\s+/g, '') === username
          );

          if (isValidMention) {
            return (
              <Text key={index} style={styles.mention}>
                {part}
              </Text>
            );
          }
        }
        return part;
      })}
    </Text>
  );
};

interface Reaction {
  emoji: string;
  count: number;
  userReacted?: boolean;
}

interface CommentProps {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  time: string;
  reactions?: Reaction[];
  replies?: number;
  replyAvatars?: string[];
  isFirst?: boolean;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onMore?: () => void;
  onFetchReactionDetails?: () => Promise<Array<{ id: string; userName: string; avatar?: string; emoji: string }>>;
  threadParticipants?: string[];
  onViewReplies?: () => void;
  onFetchReplies?: () => Promise<Array<{ id: string; author: string; avatar?: string; text: string; time: string }>>;
}

export function Comment({
  _id,
  author,
  avatar,
  text,
  time,
  reactions = [],
  replies = 0,
  replyAvatars = [],
  isFirst = false,
  onReply,
  onReact,
  onMore,
  onFetchReactionDetails,
  threadParticipants = [],
  onViewReplies,
  onFetchReplies,
}: CommentProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPosition, setReactionPosition] = useState({ x: 0, y: 0 });
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [reactionDetails, setReactionDetails] = useState<Array<{ id: string; userName: string; avatar?: string; emoji: string }>>([]);
  const [expanded, setExpanded] = useState(false);
  const [inlineReplies, setInlineReplies] = useState<Array<{ id: string; author: string; avatar?: string; text: string; time: string }>>([]);
  const commentRef = useRef<View>(null);

  const handleLongPress = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    setReactionPosition({ x: pageX, y: pageY });
    setShowReactionPicker(true);
  };

  const handleSelectReaction = (emoji: string) => {
    if (onReact) {
      onReact(emoji);
    }
    setShowReactionPicker(false);
  };

  const handleShowReactionDetails = async () => {
    if (onFetchReactionDetails) {
      try {
        const details = await onFetchReactionDetails();

        // Ensure details is an array
        if (!Array.isArray(details)) {  
          console.error('Reaction details is not an array:', details);
          setReactionDetails([]);
        } else {
          setReactionDetails(details);
        }
        setShowReactionDetails(true);
      } catch (error) {
        console.error('Failed to fetch reaction details:', error);
      }
    } else {
      console.log('No onFetchReactionDetails handler provided');
    }
  };

  const handleToggleReplies = async () => {
    if (!expanded && replies > 0 && onFetchReplies) {
      setLoadingReplies(true);
      try {
        const fetchedReplies = await onFetchReplies();
        setInlineReplies(fetchedReplies.slice(0, 3)); // Only show first 3 inline
        setExpanded(true);
      } catch (error) {
        console.error('Failed to fetch replies:', error);
      } finally {
        setLoadingReplies(false);
      }
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.95}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        <View style={styles.container} ref={commentRef}>
      {!isFirst && <View style={styles.separator} />}
      <View style={styles.content}>
        {/* Avatar Column */}
        <View style={styles.avatarColumn}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {author.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Content Column */}
        <View style={styles.contentColumn}>
          <View style={styles.header}>
            <View style={styles.authorInfo}>
              <View style={styles.authorLine}>
                <Text style={styles.authorName}>{author}</Text>
                <Text style={styles.time}>{time}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onMore} style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#8B8680" />
            </TouchableOpacity>
          </View>

          <View style={styles.textContainer}>
            <MentionText text={text} style={styles.text} validUsernames={threadParticipants} />
          </View>

          <View style={styles.actions}>
            {/* Reactions - all in one pill */}
            {reactions.length > 0 && (
              <TouchableOpacity style={styles.reactionBubble} onPress={handleShowReactionDetails}>
                <View style={styles.reactionEmojis}>
                  {reactions
                    .slice(0, 3)
                    .map((reaction, index) => (
                      <Text key={`${reaction.emoji}-${index}`} style={styles.reactionEmoji}>
                        {reaction.emoji}
                      </Text>
                    ))}
                </View>
                <Text style={styles.reactionCount}>
                  {reactions.reduce((sum, r) => sum + r.count, 0)}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onReply} style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={18} color="#8B8680" />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          </View>

          {/* Replies section - moved to its own row */}
          {replies > 0 && (
            <TouchableOpacity style={styles.repliesSection} onPress={handleToggleReplies}>
              <View style={styles.repliesAvatars}>
                {replyAvatars.length > 0 ? (
                  replyAvatars.map((avatarUrl, index) => (
                    <Image
                      key={`reply-avatar-${index}`}
                      source={{ uri: avatarUrl || `https://i.pravatar.cc/150?img=${index + 10}` }}
                      style={[
                        styles.replyAvatar,
                        index > 0 && { marginLeft: -8 } // Overlap avatars
                      ]}
                    />
                  ))
                ) : (
                  // Fallback avatars if no reply avatars are provided
                  <>
                    <Image
                      source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
                      style={styles.replyAvatar}
                    />
                    {replies > 1 && (
                      <Image
                        source={{ uri: 'https://i.pravatar.cc/150?img=23' }}
                        style={[styles.replyAvatar, { marginLeft: -8 }]}
                      />
                    )}
                  </>
                )}
              </View>
              <Text style={styles.repliesText}>{replies} {replies === 1 ? 'reply' : 'replies'}</Text>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#8B8680" />
            </TouchableOpacity>
          )}

          {/* Inline replies when expanded */}
          {expanded && inlineReplies.length > 0 && (
            <View style={styles.inlineReplies}>
              {inlineReplies.map((reply) => (
                <View key={reply.id} style={styles.inlineReplyContainer}>
                  <View style={styles.inlineReply}>
                    <View style={styles.inlineReplyAvatar}>
                      {reply.avatar ? (
                        <Image source={{ uri: reply.avatar }} style={styles.smallAvatar} />
                      ) : (
                        <View style={styles.smallAvatarPlaceholder}>
                          <Text style={styles.smallAvatarText}>
                            {reply.author?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.inlineReplyContent}>
                      <View style={styles.inlineReplyHeader}>
                        <Text style={styles.inlineReplyAuthor}>{reply.author}</Text>
                        <Text style={styles.inlineReplyTime}>{reply.time}</Text>
                      </View>
                      <MentionText
                        text={reply.text}
                        style={styles.inlineReplyText}
                        validUsernames={[author, ...inlineReplies.map((r) => r.author)]}
                      />
                    </View>
                  </View>
                </View>
              ))}

              {/* View more button if there are more than 3 replies */}
              {replies > 3 && (
                <TouchableOpacity style={styles.viewMoreButton} onPress={onViewReplies}>
                  <Text style={styles.viewMoreText}>View {replies - 3} more {replies - 3 === 1 ? 'reply' : 'replies'}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#E05F4E" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
      </TouchableOpacity>

      <ReactionPicker
        visible={showReactionPicker}
        onClose={() => setShowReactionPicker(false)}
        onSelectReaction={handleSelectReaction}
        position={reactionPosition}
      />

      <ReactionDetailsModal
        visible={showReactionDetails}
        onClose={() => setShowReactionDetails(false)}
        reactions={reactionDetails}
        commentText={text}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0EDE9',
    marginHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  avatarColumn: {
    width: 40,
    marginRight: 12,
  },
  contentColumn: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,  // Ensure minimum height matches avatar
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E5E1',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
  },
  authorInfo: {
    flex: 1,
  },
  authorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,  // Match avatar height to vertically center with it
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  time: {
    fontSize: 12,
    color: '#8B8680',
  },
  moreButton: {
    padding: 4,
  },
  textContainer: {
    marginTop: -4,
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#403837',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  reactionEmojis: {
    flexDirection: 'row',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: '#403837',
    fontWeight: '500',
  },
  actionText: {
    fontSize: 13,
    color: '#8B8680',
  },
  repliesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  repliesAvatars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  replyAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8E5E1',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  repliesText: {
    fontSize: 13,
    color: '#8B8680',
  },
  mention: {
    color: '#E05F4E',
    fontWeight: '600',
  },
  inlineReplies: {
    marginTop: 12,
    marginLeft: -52, // Negative margin to extend replies to the left edge
    marginRight: -20, // Also extend to the right edge for full width
  },
  inlineReplyContainer: {
    marginBottom: 12, // Add spacing between replies instead of separator
  },
  inlineReply: {
    flexDirection: 'row',
    paddingHorizontal: 20, // Add padding to compensate for negative margins
  },
  inlineReplyAvatar: {
    marginRight: 8,
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8E5E1',
  },
  smallAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8E5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#403837',
  },
  inlineReplyContent: {
    flex: 1,
  },
  inlineReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inlineReplyAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  inlineReplyTime: {
    fontSize: 11,
    color: '#8B8680',
  },
  inlineReplyText: {
    fontSize: 13,
    color: '#403837',
    lineHeight: 18,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
  },
  viewMoreText: {
    fontSize: 13,
    color: '#E05F4E',
    fontWeight: '600',
  },
});