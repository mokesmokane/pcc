import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

// Stock placeholder avatars
const PLACEHOLDER_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
];

interface AvatarStackProps {
  members: { id: string; avatar?: string }[];
  totalCount?: number;
  maxDisplay?: number;
  size?: 'small' | 'medium' | 'large';
  showPlaceholders?: boolean;
}

export function AvatarStack({
  members,
  totalCount,
  maxDisplay = 5,
  size = 'small',
  showPlaceholders = true,
}: AvatarStackProps) {
  // Use placeholders if no members and showPlaceholders is true
  const displayMembers = members.length > 0
    ? members.slice(0, maxDisplay)
    : showPlaceholders
      ? PLACEHOLDER_AVATARS.slice(0, maxDisplay).map((avatar, i) => ({ id: `placeholder-${i}`, avatar }))
      : [];

  const count = totalCount ?? (members.length > 0 ? members.length : (showPlaceholders ? PLACEHOLDER_AVATARS.length : 0));
  const remaining = count - maxDisplay;

  const sizeStyles = {
    small: { avatar: 24, border: 2, overlap: -8, fontSize: 9 },
    medium: { avatar: 28, border: 2, overlap: -10, fontSize: 10 },
    large: { avatar: 36, border: 2, overlap: -12, fontSize: 11 },
  }[size];

  const avatarStyle = {
    width: sizeStyles.avatar,
    height: sizeStyles.avatar,
    borderRadius: sizeStyles.avatar / 2,
    borderWidth: sizeStyles.border,
    borderColor: '#FFFFFF',
    marginRight: sizeStyles.overlap,
  };

  return (
    <View style={styles.container}>
      {displayMembers.map((member, index) => (
        <Image
          key={member.id}
          source={{ uri: member.avatar }}
          style={[avatarStyle, { zIndex: maxDisplay - index }]}
        />
      ))}
      {remaining > 0 && (
        <View style={[avatarStyle, styles.moreCount, { zIndex: 0 }]}>
          <Text style={[styles.moreCountText, { fontSize: sizeStyles.fontSize }]}>
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreCount: {
    backgroundColor: '#E8DFD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCountText: {
    fontWeight: '700',
    color: '#403837',
  },
});
