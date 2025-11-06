import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from './MiniPlayer';
import { MeetupsList } from './MeetupsList';
import { useMeetups } from '../../contexts/MeetupsContext';

interface MeetupsSheetProps {
  visible: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  episodeId?: string;
  currentTrack?: {
    title?: string;
    artist?: string;
    artwork?: string;
  };
  isPlaying: boolean;
  position: number;
  duration: number;
  onPlayPause: () => void;
  onSkipBackward?: () => void;
}

// Remove the fake data - we'll use real data from context
/*const MEETUPS_DATA: Meetup[] = [
  {
    id: '1',
    location: 'Herne Hill',
    time: '10am, Sun 3 Oct',
    venue: 'Macatia and Coffee, Half Moon Ln',
    attendees: {
      avatars: [
        'https://i.pravatar.cc/150?img=1',
        'https://i.pravatar.cc/150?img=2',
        'https://i.pravatar.cc/150?img=3',
        'https://i.pravatar.cc/150?img=4',
        'https://i.pravatar.cc/150?img=5',
        'https://i.pravatar.cc/150?img=6',
      ],
      count: 6,
    },
    spotsLeft: 2,
  },
  {
    id: '2',
    location: 'Brooklyn Heights',
    time: '2pm, Sat 9 Oct',
    venue: 'Brooklyn Roasting Company, Water St',
    attendees: {
      avatars: [
        'https://i.pravatar.cc/150?img=7',
        'https://i.pravatar.cc/150?img=8',
        'https://i.pravatar.cc/150?img=9',
        'https://i.pravatar.cc/150?img=10',
      ],
      count: 4,
    },
    spotsLeft: 4,
  },
  {
    id: '3',
    location: 'Mission District',
    time: '11am, Sun 10 Oct',
    venue: 'Blue Bottle Coffee, Valencia St',
    attendees: {
      avatars: [
        'https://i.pravatar.cc/150?img=11',
        'https://i.pravatar.cc/150?img=12',
        'https://i.pravatar.cc/150?img=13',
        'https://i.pravatar.cc/150?img=14',
        'https://i.pravatar.cc/150?img=15',
        'https://i.pravatar.cc/150?img=16',
        'https://i.pravatar.cc/150?img=17',
        'https://i.pravatar.cc/150?img=18',
      ],
      count: 8,
    },
    spotsLeft: 0,
  },
  {
    id: '4',
    location: 'Greenwich Village',
    time: '4pm, Fri 15 Oct',
    venue: 'Joe Coffee, Waverly Pl',
    attendees: {
      avatars: [
        'https://i.pravatar.cc/150?img=19',
        'https://i.pravatar.cc/150?img=20',
        'https://i.pravatar.cc/150?img=21',
      ],
      count: 3,
    },
    spotsLeft: 5,
  },
  {
    id: '5',
    location: 'Shoreditch',
    time: '9am, Sat 16 Oct',
    venue: 'Allpress Espresso, Redchurch St',
    attendees: {
      avatars: [
        'https://i.pravatar.cc/150?img=22',
        'https://i.pravatar.cc/150?img=23',
        'https://i.pravatar.cc/150?img=24',
        'https://i.pravatar.cc/150?img=25',
        'https://i.pravatar.cc/150?img=26',
      ],
      count: 5,
    },
    spotsLeft: 3,
  },
  {
    id: '6',
    location: 'Capitol Hill',
    time: '1pm, Sun 17 Oct',
    venue: 'Victrola Coffee Roasters, Pine St',
    attendees: {
      avatars: [
        'https://i.pravatar.cc/150?img=27',
        'https://i.pravatar.cc/150?img=28',
        'https://i.pravatar.cc/150?img=29',
        'https://i.pravatar.cc/150?img=30',
        'https://i.pravatar.cc/150?img=31',
        'https://i.pravatar.cc/150?img=32',
        'https://i.pravatar.cc/150?img=33',
      ],
      count: 7,
    },
    spotsLeft: 1,
  },
];*/

export function MeetupsSheet({
  visible,
  expanded,
  onToggleExpand,
  episodeId,
  currentTrack,
  isPlaying,
  position,
  duration,
  onPlayPause,
  onSkipBackward,
}: MeetupsSheetProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const {
    meetups,
    loading,
    userStatuses,
    loadMeetups,
    joinMeetup,
    leaveMeetup,
  } = useMeetups();

  useEffect(() => {
    if (episodeId && visible) {
      loadMeetups(episodeId);
    }
  }, [episodeId, visible, loadMeetups]);

  const insets = useSafeAreaInsets();
  const meetupsAnimatedValue = useRef(new Animated.Value(0)).current;
  const meetupsTranslateY = useRef(new Animated.Value(0)).current;

  const meetupsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_evt, gestureState) => {
        meetupsTranslateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 50) {
          // Dragged down enough to dismiss
          onToggleExpand();
        } else {
          // Snap back to position
          Animated.spring(meetupsTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      meetupsTranslateY.setValue(0);
      Animated.timing(meetupsAnimatedValue, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(meetupsAnimatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, expanded, meetupsAnimatedValue, meetupsTranslateY]);

  if (!visible) return null;

  // Calculate progress as percentage
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <>
      {/* Mini Player - slides down from top */}
      <Animated.View
        style={[
          styles.miniPlayerOverlay,
          {
            opacity: meetupsAnimatedValue,
            transform: [
              {
                translateY: meetupsAnimatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0],
                }),
              },
            ],
          },
        ]}
      >
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
          <MiniPlayer
            title={currentTrack?.title}
            artist={currentTrack?.artist}
            artwork={currentTrack?.artwork}
            isPlaying={isPlaying}
            progress={progress}
            position={position}
            duration={duration}
            onPlayPause={onPlayPause}
            onPress={onToggleExpand}
            onSkipBackward={onSkipBackward}
          />
        </SafeAreaView>
      </Animated.View>

      {/* Meetups Panel - slides up from bottom */}
      <Animated.View
        style={[
          styles.meetupsPanelOverlay,
          {
            transform: [
              {
                translateY: Animated.add(
                  meetupsAnimatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [680, 0],
                  }),
                  meetupsTranslateY
                ),
              },
            ],
          },
        ]}
      >
        <View style={[styles.container, { marginTop: insets.top + 64 }]}>
          {/* Meetups content with draggable header */}
          <View style={styles.meetupsContainer}>
            {/* Header */}
            <View style={[styles.header, meetupsPanResponder.panHandlers]} {...meetupsPanResponder.panHandlers}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}>
                  Meetups
                </Text>
                <Text style={styles.meetupCount}>({meetups.length})</Text>
              </View>
              <TouchableOpacity onPress={onToggleExpand} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Meetups List */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <MeetupsList
                meetups={meetups}
                loading={loading}
                userStatuses={userStatuses}
                onJoin={joinMeetup}
                onLeave={leaveMeetup}
                showDividers={true}
              />
            </ScrollView>

            {/* Fixed Footer */}
            <View style={styles.footerContainer}>
              <View style={styles.footerTextBox}>
                <Text style={styles.footerText}>
                  No meetup in your hood? 😊 Honey, start{' '}
                  your own and show &apos;em how it&apos;s done!
                </Text>
              </View>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>Add a meetup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  miniPlayerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  meetupsPanelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  meetupsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
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
  meetupCount: {
    fontSize: 12,
    fontFamily: 'aristata',
    color: '#E05F4E',
    position: 'relative',
    top: 8,
    marginLeft: 2,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 28,
    color: '#8B8680',
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  footerContainer: {
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'android' ? 60 : 20,
    marginTop: 8,
  },
  footerTextBox: {
    backgroundColor: '#F8F6F3',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 14,
    color: '#403837',
    textAlign: 'left',
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#E05F4E',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});