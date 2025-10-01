import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { MeetupCard } from './MeetupCard';
import { useMeetups } from '../../contexts/MeetupsContext';

interface MeetupsSectionProps {
  episodeId?: string;
  onViewAll?: () => void;
}

export function MeetupsSection({ episodeId, onViewAll }: MeetupsSectionProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const {
    meetups,
    loading,
    userStatuses,
    loadMeetups,
    joinMeetup,
    leaveMeetup
  } = useMeetups();

  useEffect(() => {
    if (episodeId) {
      console.log('MeetupsSection: Loading meetups for episode:', episodeId);
      loadMeetups(episodeId);
    } else {
      console.log('MeetupsSection: No episodeId provided');
    }
  }, [episodeId]);

  const firstMeetup = meetups[0];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}>
          Meetups
        </Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAllButton}>View all</Text>
        </TouchableOpacity>
      </View>

      {/* Single Meetup Card */}
      <View style={styles.cardContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#E05F4E" />
          </View>
        ) : firstMeetup ? (
          <MeetupCard
            id={firstMeetup.id}
            location={firstMeetup.location}
            meetupDate={firstMeetup.meetup_date}
            meetupTime={firstMeetup.meetup_time}
            venue={firstMeetup.venue}
            address={firstMeetup.address}
            attendees={firstMeetup.attendees || []}
            attendeeCount={firstMeetup.attendee_count}
            spotsLeft={firstMeetup.spots_left}
            userStatus={userStatuses.get(firstMeetup.id)}
            onJoin={() => joinMeetup(firstMeetup.id)}
            onLeave={() => leaveMeetup(firstMeetup.id)}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No meetups scheduled yet</Text>
            <Text style={styles.emptySubtext}>Check back soon or start your own!</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
  },
  viewAllButton: {
    fontSize: 14,
    color: '#E05F4E',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  cardContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#403837',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
  },
});