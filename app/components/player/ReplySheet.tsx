import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { CommentsInputBar } from './CommentsInputBar';
import { Comment } from './Comment';

interface ReplySheetProps {
  visible: boolean;
  onClose: () => void;
  parentComment: {
    id: string;
    author: string;
    avatar?: string;
    text: string;
    time: string;
    reactions?: { emoji: string; count: number; userReacted?: boolean }[];
  } | null;
  replies: {
    id: string;
    author: string;
    avatar?: string;
    text: string;
    time: string;
    reactions?: { emoji: string; count: number; userReacted?: boolean }[];
  }[];
  onSubmitReply: (text: string) => Promise<void>;
  onReact?: (commentId: string, emoji: string) => void;
  onMore?: (commentId: string) => void;
}

export function ReplySheet({
  visible,
  onClose,
  parentComment,
  replies,
  onSubmitReply,
  onReact,
  onMore,
}: ReplySheetProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(1000)).current;
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [inputValue, setInputValue] = React.useState<string>('');
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 1000,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setReplyingTo(null); // Reset when closing
      setInputValue(''); // Clear input when closing
    }
  }, [visible]);

  const handleClose = () => {
    // Animate the sheet away first
    Animated.timing(slideAnim, {
      toValue: 1000,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Call onClose after animation completes
      onClose();
    });
  };

  if (!visible || !parentComment) return null;

  // Collect all participant names from the parent and replies
  const threadParticipants = [parentComment.author, ...replies.map(r => r.author)];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.content, { paddingTop: insets.top + 64 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={[styles.headerTitle, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}>
                Replies
              </Text>
              <Text style={styles.replyCount}>({replies.length})</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#8B8680" />
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Parent comment */}
            <View style={styles.parentCommentContainer}>
              <Comment
                id={parentComment.id}
                author={parentComment.author}
                avatar={parentComment.avatar}
                text={parentComment.text}
                time={parentComment.time}
                reactions={parentComment.reactions}
                replies={0} // Don't show reply count in this view
                isFirst={true}
                onReply={() => {}} // No reply on parent in this view
                onReact={onReact ? (emoji) => onReact(parentComment.id, emoji) : undefined}
                onMore={onMore ? () => onMore(parentComment.id) : undefined}
                threadParticipants={threadParticipants}
              />
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Replies */}
            <View style={styles.repliesContainer}>
              {replies.length > 0 ? (
                replies.map((reply, index) => (
                  <Comment
                    key={reply.id}
                    id={reply.id}
                    author={reply.author}
                    avatar={reply.avatar}
                    text={reply.text}
                    time={reply.time}
                    reactions={reply.reactions}
                    replies={0}
                    isFirst={index === 0}
                    onReply={() => {
                      // Format username for @mention (remove spaces, lowercase)
                      const username = reply.author.replace(/\s+/g, '').toLowerCase();
                      setReplyingTo(reply.author);
                      setInputValue(`@${username} `);
                    }}
                    onReact={onReact ? (emoji) => onReact(reply.id, emoji) : undefined}
                    onMore={onMore ? () => onMore(reply.id) : undefined}
                    threadParticipants={threadParticipants}
                  />
                ))
              ) : (
                <Text style={styles.noRepliesText}>Be the first to reply</Text>
              )}
            </View>

            {/* Bottom padding for input */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Reply input */}
          <CommentsInputBar
            value={inputValue}
            onChangeText={setInputValue}
            onSubmit={async (text) => {
              await onSubmitReply(text);
              setReplyingTo(null); // Clear after submitting
              setInputValue(''); // Clear the input
            }}
            placeholder={replyingTo ? `Reply to ${replyingTo}...` : `Reply to ${parentComment.author}...`}
            includeBottomPadding
          />
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',  // Make container transparent
    zIndex: 1000,  // Same as discussion panel, below MiniPlayer
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE9',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
  },
  replyCount: {
    fontSize: 12,
    fontFamily: 'aristata',
    color: '#E05F4E',
    position: 'relative',
    top: 8,
    marginLeft: 2,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  parentCommentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FAFAFA',
  },
  divider: {
    height: 8,
    backgroundColor: '#F4F1ED',
  },
  repliesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  noRepliesText: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    paddingVertical: 32,
  },
});