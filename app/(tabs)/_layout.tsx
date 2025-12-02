import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '../components/player/MiniPlayer';
import { ProfileMenu } from '../components/ProfileMenu';
import { NotificationsModal } from '../components/NotificationsModal';
import { useIsPlaying, usePlaybackControls, useCurrentTrack } from '../stores/audioStore.hooks';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentProfile } from '../hooks/queries/useProfile';
import { useNotifications } from '../contexts/NotificationsContext';
import { useWeeklySelections } from '../contexts/WeeklySelectionsContext';
import { inviteService } from '../services/invite.service';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const { user } = useAuth();
  const { data: profile } = useCurrentProfile();
  const { unreadCount } = useNotifications();
  const isPlaying = useIsPlaying();
  const { play, pause, skipBackward } = usePlaybackControls();
  const { currentTrack, position, duration } = useCurrentTrack();
  const { userChoice } = useWeeklySelections();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E8E5E1',
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom + 8,
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
                <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/create-club')}>
                  <Ionicons name="add-circle-outline" size={28} color="#403837" />
                </TouchableOpacity>

                <View style={styles.rightSection}>
                  <TouchableOpacity
                    style={styles.inviteButton}
                    onPress={() => {
                      const message = inviteService.generateInviteMessage(profile?.firstName);
                      inviteService.shareInvite(message);
                    }}
                  >
                    <Text style={styles.inviteButtonText}>Invite friends</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setShowNotificationsModal(true)}
                  >
                    <Ionicons name="notifications-outline" size={24} color="#403837" />
                    {unreadCount > 0 && (
                      <View style={styles.notificationBadge}>
                        <Text style={styles.notificationBadgeText}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                      </View>
                    )}
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
            title: 'Clubs',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.tabIconContainer}>
                {focused && <View style={styles.activeIndicator} />}
                <Ionicons name="home-outline" size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Events',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.tabIconContainer}>
                {focused && <View style={styles.activeIndicator} />}
                <Ionicons name="calendar-outline" size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="podcasts"
          options={{
            title: 'Podcasts',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.tabIconContainer}>
                {focused && <View style={styles.activeIndicator} />}
                <Ionicons name="grid-outline" size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Up Next',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.tabIconContainer}>
                {focused && <View style={styles.activeIndicator} />}
                <Ionicons name="list-outline" size={size} color={color} />
              </View>
            ),
          }}
        />
      </Tabs>

      {/* MiniPlayer - positioned above tab bar, hidden during weekly selection */}
      {currentTrack && userChoice && (
        <View style={[styles.miniPlayerContainer, { bottom: 70 + insets.bottom}]}>
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

      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12
  },
  tabIconContainer: {
    alignItems: 'center',
  },
  activeIndicator: {
    width: 24,
    height: 4,
    backgroundColor: '#E05F4E',
    borderRadius: 2,
    marginBottom: 4,
    position: 'absolute',
    top: -10,
  },
  miniPlayerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#F4F1ED',
  },
  iconButton: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E05F4E',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
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