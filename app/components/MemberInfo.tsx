import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MemberData {
  id: string;
  name: string;
  avatar?: string;
  progress: number;
  hasFinished: boolean;
  commentCount: number;
  lastActivity: string;
  isCurrentUser: boolean;
}

interface MemberInfoProps {
  member: MemberData;
  onPress?: () => void;
  isFriend?: boolean;
}

// Generate DiceBear avatar URL
const getDiceBearAvatar = (seed: string) => {
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodedSeed}&backgroundColor=f4f1ed`;
};

export function MemberInfo({ member, onPress, isFriend = false }: MemberInfoProps) {
  const isCompleted = member.progress >= 95;
  const isGhost = member.progress < 5 && !member.lastActivity.includes('now') && !member.lastActivity.includes('min');

  // Use provided avatar, or generate one based on member id
  const avatarUrl = member.avatar || getDiceBearAvatar(member.id);

  return (
    <TouchableOpacity style={styles.memberItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.avatarContainer}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        {isFriend && (
          <View style={styles.friendBadge}>
            <Ionicons name="people" size={12} color="#FFFFFF" />
          </View>
        )}
      </View>

      <View style={styles.memberInfo}>
        <View style={styles.nameContainer}>
          <Text style={styles.memberName}>{member.name}</Text>
          {isFriend && <Text style={styles.friendLabel}>Friend</Text>}
        </View>
        <Text style={[
          styles.lastOnline,
          member.lastActivity.includes('now') && styles.onlineNow
        ]}>
          {member.lastActivity.includes('now') ? 'Listening now' : member.lastActivity}
        </Text>
      </View>

      <View style={styles.memberRight}>
        {isCompleted ? (
          <View style={styles.statusContainer}>
            <Text style={styles.completedText}>Completed 🎉</Text>
            {member.commentCount > 0 && (
              <Text style={styles.commentCount}>
                {member.commentCount} comment{member.commentCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        ) : isGhost ? (
          <View style={styles.statusContainer}>
            <Text style={styles.ghostText}>Ghost 👻</Text>
            {member.commentCount > 0 && (
              <Text style={styles.commentCount}>
                {member.commentCount} comment{member.commentCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.statusContainer}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${member.progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(member.progress)}%</Text>
            </View>
            {member.commentCount > 0 && (
              <Text style={styles.commentCount}>
                {member.commentCount} comment{member.commentCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  friendBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#E05F4E',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#403837',
  },
  friendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E05F4E',
    backgroundColor: '#FFF5F4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lastOnline: {
    fontSize: 13,
    color: '#8B8680',
  },
  onlineNow: {
    color: '#E05F4E',
    fontWeight: '500',
  },
  memberRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  progressBar: {
    width: 60,
    height: 8,
    backgroundColor: '#F0EDE9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E05F4E',
  },
  progressText: {
    fontSize: 14,
    color: '#E05F4E',
    fontWeight: '600',
    minWidth: 35,
  },
  completedText: {
    fontSize: 14,
    color: '#E05F4E',
    fontWeight: '600',
  },
  ghostText: {
    fontSize: 14,
    color: '#8B8680',
    fontWeight: '500',
  },
  commentCount: {
    fontSize: 11,
    color: '#8B8680',
    marginTop: 2,
  },
});