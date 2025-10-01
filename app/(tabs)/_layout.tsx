import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '../components/player/MiniPlayer';
import { ProfileMenu } from '../components/ProfileMenu';
import { useAudio } from '../contexts/AudioContextExpo';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    play,
    pause,
    skipBackward,
  } = useAudio();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E8E5E1',
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#E05F4E',
          tabBarInactiveTintColor: '#8B8680',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          header: () => (
            <SafeAreaView style={styles.headerContainer} edges={['top']}>
              <View style={styles.header}>
                <TouchableOpacity style={styles.iconButton}>
                  <Ionicons name="add-circle-outline" size={28} color="#403837" />
                </TouchableOpacity>

                <View style={styles.rightSection}>
                  <TouchableOpacity style={styles.inviteButton}>
                    <Text style={styles.inviteButtonText}>Invite friends</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="notifications-outline" size={24} color="#403837" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={() => setShowProfileMenu(true)}>
                    <Ionicons name="person-circle-outline" size={28} color="#403837" />
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          )
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Events',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* MiniPlayer - positioned above tab bar */}
      {currentTrack && (
        <View style={[styles.miniPlayerContainer, { bottom: 60 + insets.bottom}]}>
          <MiniPlayer
            title={currentTrack.title}
            artist={currentTrack.artist}
            artwork={currentTrack.artwork}
            isPlaying={isPlaying}
            progress={duration > 0 ? (position / duration) * 100 : 0}
            position={position}
            duration={duration}
            onPlayPause={async () => {
              if (isPlaying) {
                await pause();
              } else {
                await play();
              }
            }}
            onPress={() => {
              router.push({
                pathname: '/player',
                params: {
                  trackId: currentTrack.id,
                  trackTitle: currentTrack.title,
                  trackArtist: currentTrack.artist,
                  trackArtwork: currentTrack.artwork,
                  trackAudioUrl: currentTrack.url,
                  trackDescription: currentTrack.description,
                },
              });
            }}
            onSkipBackward={skipBackward}
          />
        </View>
      )}

      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        userName={profile?.firstName || user?.email || 'User'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  headerContainer: {
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  miniPlayerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#F4F1ED',
  },
  iconButton: {
    padding: 4,
  },
  inviteButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});