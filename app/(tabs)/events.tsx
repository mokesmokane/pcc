import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
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
    loadAllMeetups();
  }, []);

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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            No meetup near you? 😊 Be a community
          </Text>
          <Text style={styles.footerText}>
            hero - start one!
          </Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>Add a meetup</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}