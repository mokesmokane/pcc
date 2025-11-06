import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MemberInfo } from '../MemberInfo';
import { useMembers } from '../../contexts/MembersContext';
import { useFriendIds } from '../../hooks/queries/useFriends';

interface MembersSectionProps {
  episodeId?: string;
  limitMembers?: number;
  onViewAll?: () => void;
  progressPercentage?: number;
}

export function MembersSection({
  episodeId,
  limitMembers = 3,
  onViewAll,
  progressPercentage = 0
}: MembersSectionProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const { members, stats, currentUserProgress, loading, loadMembers } = useMembers();
  const friendIds = useFriendIds();

  // Load members when episode changes
  useEffect(() => {
    if (episodeId) {
      loadMembers(episodeId);
    }
  }, [episodeId, loadMembers]);

  // Sort members with friends first
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aIsFriend = friendIds.has(a.userId);
      const bIsFriend = friendIds.has(b.userId);

      // Friends come first
      if (aIsFriend && !bIsFriend) return -1;
      if (!aIsFriend && bIsFriend) return 1;

      // Otherwise maintain original order
      return 0;
    });
  }, [members, friendIds]);

  // Use currentUserProgress if available, otherwise use passed progressPercentage
  const displayProgress = currentUserProgress || progressPercentage;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color="#E05F4E" />
      </View>
    );
  }

  const displayMembers = sortedMembers.slice(0, limitMembers);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}>
            Members
          </Text>
          <Text style={styles.memberCount}>({stats.totalMembers})</Text>
        </View>
        {onViewAll && stats.totalMembers > limitMembers && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAllButton}>View all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Members List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={members.length > limitMembers}
        nestedScrollEnabled={true}
      >
        {displayMembers.map(member => (
          <MemberInfo
            key={member.id}
            member={member}
            isFriend={friendIds.has(member.userId)}
          />
        ))}

        {/* Empty state */}
        {members.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No members yet</Text>
            <Text style={styles.emptyStateSubtext}>Be the first to join this episode!</Text>
          </View>
        )}
      </ScrollView>

      {/* Motivational Section */}
      {members.length > 0 && (
        <View style={styles.motivationalSection}>
          <Text style={styles.motivationalText}>
            💪 {displayProgress > 0 ? `${Math.round(displayProgress)}% complete! ` : ''}Be part of the {stats.totalMembers > 0 && stats.finishedCount > 0 ? Math.round((stats.finishedCount / stats.totalMembers) * 100) : 0}% who already finished. You&apos;re too good to ghost on yourself. 👻
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
  },
  memberCount: {
    fontSize: 12,
    fontFamily: 'aristata',
    color: '#E05F4E',
    position: 'relative',
    top: 8,
    marginLeft: 2,
  },
  viewAllButton: {
    fontSize: 14,
    color: '#E05F4E',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  scrollView: {
    maxHeight: 300,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8B8680',
  },
  motivationalSection: {
    backgroundColor: '#F8F5F2',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 14,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 4,
  },
  motivationalText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#403837',
  },
});