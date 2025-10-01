import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReactionDetail {
  emoji: string;
  users: Array<{
    id: string;
    username: string;
    avatar?: string;
  }>;
}

interface ReactionDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  reactions: ReactionDetail[];
  commentText?: string;
}

export function ReactionDetailsModal({
  visible,
  onClose,
  reactions,
  commentText,
}: ReactionDetailsModalProps) {

  // Ensure reactions is an array
  const safeReactions = Array.isArray(reactions) ? reactions : [];

  // Group all reactions together
  const allReactions = safeReactions.flatMap(reaction => {
    if (!reaction.users || !Array.isArray(reaction.users)) {
      return [];
    }
    return reaction.users.map(user => ({
      emoji: reaction.emoji,
      user,
    }));
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.container}
          activeOpacity={1}
          onPress={() => {}}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {allReactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No reactions yet</Text>
              </View>
            ) : (
              allReactions.map((reaction, index) => (
              <View key={`${reaction.user.id}-${reaction.emoji}-${index}`} style={styles.reactionRow}>
                {/* User avatar */}
                {reaction.user.avatar ? (
                  <Image source={{ uri: reaction.user.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {reaction.user.username?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}

                {/* Username */}
                <Text style={styles.username}>{reaction.user.username || 'Anonymous'}</Text>

                {/* Reaction emoji */}
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              </View>
            ))
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 320,
    maxHeight: '50%',
    overflow: 'hidden',
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
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
    backgroundColor: '#E05F4E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  username: {
    flex: 1,
    fontSize: 15,
    color: '#403837',
    fontWeight: '500',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#8B8680',
  },
});