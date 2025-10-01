import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { MeetupCard } from './MeetupCard';
import { MeetupDetailsModal } from './MeetupDetailsModal';

interface MeetupsListProps {
  meetups: any[];
  loading?: boolean;
  userStatuses?: Map<string, 'confirmed' | 'waitlist' | null>;
  onJoin?: (meetupId: string) => void;
  onLeave?: (meetupId: string) => void;
  showDividers?: boolean;
  emptyMessage?: string;
  emptySubtext?: string;
}

export function MeetupsList({
  meetups,
  loading = false,
  userStatuses = new Map(),
  onJoin,
  onLeave,
  showDividers = true,
  emptyMessage = 'No meetups scheduled yet',
  emptySubtext = 'Be the first to create one!',
}: MeetupsListProps) {
  const [selectedMeetup, setSelectedMeetup] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleMeetupPress = (meetup: any) => {
    setSelectedMeetup(meetup);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMeetup(null);
  };
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E05F4E" />
      </View>
    );
  }

  if (meetups.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        <Text style={styles.emptySubtext}>{emptySubtext}</Text>
      </View>
    );
  }

  return (
    <>
      {meetups.map((meetup, index) => (
        <View key={meetup.id} style={styles.meetupItemContainer}>
          <MeetupCard
            id={meetup.id}
            location={meetup.location}
            meetupDate={meetup.meetup_date}
            meetupTime={meetup.meetup_time}
            venue={meetup.venue}
            address={meetup.address}
            attendees={meetup.attendees || []}
            attendeeCount={meetup.attendee_count}
            spotsLeft={meetup.spots_left}
            userStatus={userStatuses.get(meetup.id)}
            onJoin={onJoin ? () => onJoin(meetup.id) : undefined}
            onLeave={onLeave ? () => onLeave(meetup.id) : undefined}
            onPress={() => handleMeetupPress(meetup)}
          />
          {/* Add divider between items, except for the last one */}
          {showDividers && index < meetups.length - 1 && <View style={styles.divider} />}
        </View>
      ))}

      <MeetupDetailsModal
        visible={modalVisible}
        onClose={handleCloseModal}
        meetup={selectedMeetup}
        userStatus={selectedMeetup ? userStatuses.get(selectedMeetup.id) : null}
        onJoin={selectedMeetup && onJoin ? () => {
          onJoin(selectedMeetup.id);
        } : undefined}
        onLeave={selectedMeetup && onLeave ? () => {
          onLeave(selectedMeetup.id);
        } : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  meetupItemContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EDE9',
    marginHorizontal: 20,
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
  },
});