import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useAudio } from '../../contexts/AudioContextExpo';
import { usePodcastMetadata } from '../../contexts/PodcastMetadataContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UpNextSheetProps {
  visible: boolean;
  onClose: () => void;
  onTrackPress: (track: any) => void;
}

export function UpNextSheet({ visible, onClose, onTrackPress }: UpNextSheetProps) {
  const { queue, currentTrack } = useAudio();
  const { getEpisodeProgress } = usePodcastMetadata();
  const [tracks, setTracks] = useState<any[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  useEffect(() => {
    if (visible) {
      setIsClosing(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    setIsClosing(true);
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      setIsClosing(false);
    });
  };

  useEffect(() => {
    const loadTracksWithProgress = async () => {
      // Combine current track and queue, avoiding duplicates
      const allTracks = currentTrack ? [currentTrack, ...queue] : queue;

      // Remove duplicates by ID
      const uniqueTracks = allTracks.filter((track, index, self) =>
        index === self.findIndex((t) => t.id === track.id)
      );

      const tracksWithProgress = await Promise.all(
        uniqueTracks.map(async (track) => {
          const progress = await getEpisodeProgress(track.id);
          return {
            ...track,
            progressPercentage: progress?.progressPercentage || 0,
          };
        })
      );
      setTracks(tracksWithProgress);
    };

    if (visible) {
      loadTracksWithProgress();
    }
  }, [queue, currentTrack, visible]);

  const renderTrack = ({ item, index }: { item: any; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;
    const artwork = item.artwork || item.image;
    const episodeTitle = item.artist || item.source || item.episode;

    return (
      <TouchableOpacity
        style={[styles.trackItem, isCurrentTrack && styles.trackItemActive]}
        onPress={() => {
          onTrackPress(item);
          handleClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.trackLeft}>
          <Text style={[styles.trackNumber, isCurrentTrack && styles.trackNumberActive]}>
            {index + 1}
          </Text>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: artwork }}
              style={styles.trackImage}
            />
            {isCurrentTrack && (
              <View style={styles.nowPlayingBadge}>
                <Ionicons name="play" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, isCurrentTrack && styles.trackTitleActive]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.trackEpisode} numberOfLines={1}>
              {episodeTitle}
            </Text>
          </View>
        </View>

        {item.progressPercentage > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${item.progressPercentage}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(item.progressPercentage)}%
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="musical-notes-outline" size={64} color="#C4C1BB" />
      <Text style={styles.emptyText}>No episodes in your queue</Text>
      <Text style={styles.emptySubtext}>
        Episodes you play will appear here
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible || isClosing}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Play queue</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#403837" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={tracks}
            renderItem={renderTrack}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.list,
              tracks.length === 0 && styles.emptyList
            ]}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.8,
    backgroundColor: '#F8F6F3',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
    flex: 1,
    textAlign: 'left',
  },
  closeButton: {
    padding: 4,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  trackItemActive: {
    backgroundColor: '#FFF5F3',
    borderWidth: 1,
    borderColor: '#E05F4E',
  },
  trackLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B8680',
    width: 24,
  },
  trackNumberActive: {
    color: '#E05F4E',
  },
  imageContainer: {
    position: 'relative',
  },
  nowPlayingBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#E05F4E',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 4,
  },
  trackTitleActive: {
    color: '#E05F4E',
  },
  trackEpisode: {
    fontSize: 12,
    color: '#8B8680',
    marginBottom: 2,
  },
  progressSection: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  progressBar: {
    width: 60,
    height: 3,
    backgroundColor: '#F0EDE9',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E05F4E',
  },
  progressText: {
    fontSize: 10,
    color: '#8B8680',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#403837',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
