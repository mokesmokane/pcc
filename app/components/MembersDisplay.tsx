import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

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

interface MemberStats {
  totalMembers: number;
  finishedCount: number;
  averageProgress: number;
  totalComments: number;
}

interface MembersDisplayProps {
  progressPercentage?: number;
  members?: MemberData[];
  stats?: MemberStats;
}


export function MembersDisplay({ progressPercentage = 0, members = [], stats }: MembersDisplayProps) {
  const displayedMembers = members.slice(0, 8);

  // Default stats if not provided
  const memberStats = stats || {
    totalMembers: 0,
    finishedCount: 0,
    averageProgress: 0,
    totalComments: 0,
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.membersList}>
          {displayedMembers.map((member) => (
            <View key={member.id} style={styles.memberAvatar}>
              <Image source={{ uri: member.avatar }} style={styles.avatar} />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.motivationalSection}>
        <Text style={styles.motivationalText}>
          💪 {progressPercentage > 0 ? `${Math.round(progressPercentage)}% complete! ` : ''}Be part of the {memberStats.totalMembers > 0 && memberStats.finishedCount > 0 ? Math.round((memberStats.finishedCount / memberStats.totalMembers) * 100) : 0}% who already finished. You&apos;re too good to ghost on yourself. 👻
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  membersList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    marginRight: -8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  motivationalSection: {
    backgroundColor: '#F8F5F2',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 14,
    borderRadius: 20,
    marginTop: 20,
  },
  motivationalText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#403837',
  },
});