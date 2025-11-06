import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from './MiniPlayer';
import { MemberInfo } from '../MemberInfo';
import { useMembers } from '../../contexts/MembersContext';

interface MembersSheetProps {
  visible: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
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
  episodeId?: string;
}


export function MembersSheet({
  visible,
  expanded,
  onToggleExpand,
  currentTrack,
  isPlaying,
  position,
  duration,
  onPlayPause,
  onSkipBackward,
  episodeId,
}: MembersSheetProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const { members, stats, loading, loadMembers } = useMembers();
  const insets = useSafeAreaInsets();
  const membersAnimatedValue = useRef(new Animated.Value(0)).current;
  const membersTranslateY = useRef(new Animated.Value(0)).current;

  const membersPanResponder = useRef(
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
        membersTranslateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 50) {
          // Dragged down enough to dismiss
          onToggleExpand();
        } else {
          // Snap back to position
          Animated.spring(membersTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Load members when episode changes
  useEffect(() => {
    if (episodeId) {
      loadMembers(episodeId);
    }
  }, [episodeId, loadMembers]);

  useEffect(() => {
    if (visible) {
      membersTranslateY.setValue(0);
      Animated.timing(membersAnimatedValue, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(membersAnimatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, expanded, membersAnimatedValue, membersTranslateY]);

  if (!visible) return null;

  // Calculate progress as percentage
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  // Separate current user from other members
  const currentUser = members.find(m => m.isCurrentUser);
  const otherMembers = members.filter(m => !m.isCurrentUser);

  return (
    <>
      {/* Mini Player - slides down from top */}
      <Animated.View
        style={[
          styles.miniPlayerOverlay,
          {
            opacity: membersAnimatedValue,
            transform: [
              {
                translateY: membersAnimatedValue.interpolate({
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

      {/* Members Panel - slides up from bottom */}
      <Animated.View
        style={[
          styles.membersPanelOverlay,
          {
            transform: [
              {
                translateY: Animated.add(
                  membersAnimatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [680, 0],
                  }),
                  membersTranslateY
                ),
              },
            ],
          },
        ]}
      >
        <View style={[styles.container, { marginTop: insets.top + 64 }]}>
          {/* Members content with draggable header */}
          <View style={styles.membersContainer}>
            {/* Header */}
            <View style={styles.header} {...membersPanResponder.panHandlers}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}>
                  Members
                </Text>
                <Text style={styles.memberCount}>({stats.totalMembers})</Text>
              </View>
              <TouchableOpacity onPress={onToggleExpand} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Members List */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#E05F4E" />
                </View>
              ) : (
                <>
                  {/* Current User Section */}
                  {currentUser && (
                    <>
                      <Text style={styles.sectionTitle}>You</Text>
                      <MemberInfo member={currentUser} />
                    </>
                  )}

                  {/* Other Members Section */}
                  {otherMembers.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Other Members</Text>
                      {otherMembers.map(member => (
                        <MemberInfo key={member.id} member={member} />
                      ))}
                    </>
                  )}

                  {/* Empty state */}
                  {members.length === 0 && (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No members yet</Text>
                      <Text style={styles.emptyStateSubtext}>Be the first to join this episode!</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
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
  membersPanelOverlay: {
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
  membersContainer: {
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
  memberCount: {
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
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E05F4E',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
});