import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useWeeklySelections } from '../../contexts/WeeklySelectionsContext';

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackRate?: number;
  isDownloaded?: boolean;
  onPlayPause: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onSpeedPress?: () => void;
  onSleepTimerPress?: () => void;
  onSharePress?: () => void;
  onDownloadPress?: () => void;
}

export function PlaybackControls({
  isPlaying,
  playbackRate = 1,
  isDownloaded = false,
  onPlayPause,
  onSkipForward,
  onSkipBackward,
  onSpeedPress,
  onSleepTimerPress,
  onSharePress,
  onDownloadPress
}: PlaybackControlsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const { clearUserChoice } = useWeeklySelections();

  const handleMenuItemPress = (action: () => void | undefined) => {
    setShowMenu(false);
    action?.();
  };

  const handlePickDifferentPodcast = () => {
    setShowMenu(false);
    // Clear the user's choice to show weekly selection
    clearUserChoice();
    // Navigate to home tab - the home screen will show weekly selection if no podcast chosen
    router.push('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      {/* Speed Control */}
      <TouchableOpacity onPress={onSpeedPress} style={styles.speedButton}>
        <Text style={styles.speedText}>{playbackRate}x</Text>
      </TouchableOpacity>

      {/* Main Playback Controls */}
      <View style={styles.mainControls}>
      <TouchableOpacity onPress={onSkipBackward} style={styles.skipButton}>
        <View style={styles.skipButtonContent}>
          <Ionicons name="refresh" size={48} color="#403837" style={{ transform: [{ scaleX: -1 }] }} />
          <Text style={styles.skipButtonText}>15</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={onPlayPause} style={styles.playButton}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={32}
          color="#fff"
          style={isPlaying ? {} : { marginLeft: 4 }}
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={onSkipForward} style={styles.skipButton}>
        <View style={styles.skipButtonContent}>
          <Ionicons name="refresh" size={48} color="#403837" />
          <Text style={styles.skipButtonText}>30</Text>
        </View>
      </TouchableOpacity>
      </View>

      {/* Menu Button */}
      <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
        <Ionicons name="ellipsis-horizontal" size={24} color="#403837" />
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        transparent
        visible={showMenu}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuContainer}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress(onSleepTimerPress)}
                >
                  <Ionicons name="moon-outline" size={20} color="#403837" />
                  <Text style={styles.menuItemText}>Sleep Timer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress(onSharePress)}
                >
                  <Ionicons name="share-social-outline" size={20} color="#403837" />
                  <Text style={styles.menuItemText}>Share</Text>
                </TouchableOpacity>

                {!isDownloaded && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleMenuItemPress(onDownloadPress)}
                  >
                    <Ionicons name="download-outline" size={20} color="#403837" />
                    <Text style={styles.menuItemText}>Download</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handlePickDifferentPodcast}
                >
                  <Ionicons name="albums-outline" size={20} color="#E05F4E" />
                  <Text style={[styles.menuItemText, { color: '#E05F4E' }]}>Pick Different Podcast</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  speedButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0EDE9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#403837',
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0EDE9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    padding: 4,
    position: 'relative',
  },
  skipButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  skipButtonText: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
    color: '#403837',
    marginTop: 8,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E05F4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#403837',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
    marginHorizontal: 8,
  },
});