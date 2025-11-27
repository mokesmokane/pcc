import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MeetupsList } from '../components/player/MeetupsList';
import { useMeetups } from '../contexts/MeetupsContext';
import { styles } from '../styles/events.styles';

export default function EventsScreen() {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const {
    meetups,
    loading,
    userStatuses,
    loadAllMeetups,
    joinMeetup,
    leaveMeetup,
  } = useMeetups();

  // Load all upcoming meetups on mount
  useEffect(() => {
    console.log('EventsScreen: useEffect triggered, calling loadAllMeetups');
    console.log('EventsScreen: loadAllMeetups is:', typeof loadAllMeetups);
    loadAllMeetups();
  }, [loadAllMeetups]);

  // Debug: Log meetups state
  useEffect(() => {
    console.log('EventsScreen: meetups state:', meetups?.length || 0, 'loading:', loading);
  }, [meetups, loading]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Fixed Title Section */}
      <View style={styles.titleSection}>
        <Text style={[styles.mainTitle, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
          Discuss podcasts
        </Text>
        <Text style={[styles.mainTitle, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
          in-person
        </Text>
        <Text style={styles.subtitle}>
          Find a meetup near you or start your own
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Meetup Cards */}
        <Text style={styles.sectionHeading}>Upcoming</Text>
        <MeetupsList
          meetups={meetups}
          loading={loading}
          userStatuses={userStatuses}
          onJoin={joinMeetup}
          onLeave={leaveMeetup}
          showDividers={false}
          emptyMessage="No upcoming meetups"
          emptySubtext="Be the first to create one!"
        />
      </ScrollView>

      {/* Footer - fixed at bottom */}
      <View style={styles.footer}>
        <View style={styles.speechBubble}>
          <Text style={styles.footerText}>
            No meetup near you? 😊 Be a community hero - start one!
          </Text>
          <View style={styles.speechBubbleTail} />
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>Add a meetup</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}