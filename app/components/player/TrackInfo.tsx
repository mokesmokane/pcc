import { Ionicons } from '@expo/vector-icons';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMembers } from '../../contexts/MembersContext';
import { AvatarStack } from '../AvatarStack';

interface TrackInfoProps {
  title?: string;
  artist?: string;
  isDownloaded: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  episodeId?: string;
}

export function TrackInfo({
  title = 'Select a podcast to play',
  artist = '',
  isDownloaded,
  isDownloading,
  onDownload,
  episodeId
}: TrackInfoProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const { members, stats, loadMembers } = useMembers();

  useEffect(() => {
    if (episodeId) {
      loadMembers(episodeId);
    }
  }, [episodeId]);

  // Count members listening now
  const listeningNow = members.filter(m =>
    m.lastActivity.includes('now') || m.lastActivity.includes('Listening now')
  ).length;
  return (
    <View style={styles.container}>
      <Text style={[styles.title, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]} numberOfLines={3}>
        {artist}
      </Text>
      <Text style={styles.artist}>{title}</Text>

      <View style={styles.statsContainer}>
        <View style={styles.statsContent}>
          <View style={styles.avatarRow}>
            <AvatarStack
              members={members.map(m => ({ id: m.id, avatar: m.avatar, name: m.name }))}
              totalCount={stats.totalMembers}
              maxDisplay={5}
              size="medium"
            />
            <Text style={styles.statText}>{stats.totalMembers} in the club</Text>
          </View>
          {listeningNow > 0 && (
            <View style={styles.stat}>
              <Text style={styles.statEmoji}>🎧</Text>
              <Text style={styles.statText}>{listeningNow} listening now</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={onDownload}
          style={styles.downloadIconButton}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#E05F4E" />
          ) : (
            <Ionicons
              name={isDownloaded ? "checkmark-circle" : "download-outline"}
              size={24}
              color="#E05F4E"
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '400',
    color: '#E05F4E',
    marginBottom: 8,
    lineHeight: 28,
  },
  artist: {
    fontSize: 14,
    color: '#8B8680',
    marginBottom: 16,
  },
  statsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsContent: {
    flex: 1,
  },
  downloadIconButton: {
    padding: 8,
    marginLeft: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  statText: {
    fontSize: 12,
    color: '#8B8680',
  },
});