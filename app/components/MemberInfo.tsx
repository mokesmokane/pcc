import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
}

export function MemberInfo({ member, onPress }: MemberInfoProps) {
  const isCompleted = member.progress >= 95;
  const isGhost = member.progress < 5 && !member.lastActivity.includes('now') && !member.lastActivity.includes('min');

  return (
    <TouchableOpacity style={styles.memberItem} onPress={onPress} disabled={!onPress}>
      <Image source={{ uri: member.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />

      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name}</Text>
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
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 4,
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