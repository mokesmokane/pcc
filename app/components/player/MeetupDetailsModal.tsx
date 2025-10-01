import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import { format, parseISO } from 'date-fns';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';

interface MeetupDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  meetup: {
    id: string;
    title?: string;
    description?: string;
    location: string;
    meetup_date: string;
    meetup_time: string;
    venue: string;
    address: string;
    attendees: {
      user_id: string;
      avatar_url?: string;
      username?: string;
    }[];
    attendee_count: number;
    spots_left: number;
    related_episodes?: {
      episode_id: string;
      episode_title: string;
      podcast_title: string;
      artwork_url?: string;
      attendees_who_listened?: {
        user_id: string;
        username?: string;
        avatar_url?: string;
        progress: number;
        completed: boolean;
      }[];
    }[];
  } | null;
  userStatus?: 'confirmed' | 'waitlist' | null;
  onJoin?: () => void;
  onLeave?: () => void;
}

export function MeetupDetailsModal({
  visible,
  onClose,
  meetup,
  userStatus,
  onJoin,
  onLeave,
}: MeetupDetailsModalProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  if (!meetup) return null;

  const formatMeetupDateTime = () => {
    try {
      const date = parseISO(meetup.meetup_date);
      const [hours, minutes] = meetup.meetup_time.split(':');
      date.setHours(parseInt(hours), parseInt(minutes));

      const timeStr = format(date, 'ha').toLowerCase();
      const dateStr = format(date, 'EEEE, MMMM d, yyyy');
      return { time: timeStr, date: dateStr };
    } catch {
      return { time: meetup.meetup_time, date: meetup.meetup_date };
    }
  };

  const handleOpenMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetup.address)}`;
    Linking.openURL(url);
  };

  const dateTime = formatMeetupDateTime();

  // Filter out invalid/deleted episodes
  const validEpisodes = meetup.related_episodes?.filter(
    episode => episode.episode_id && episode.episode_title
  ) || [];

  console.log('MeetupDetailsModal - related_episodes:', meetup.related_episodes);
  console.log('MeetupDetailsModal - validEpisodes:', validEpisodes);
  validEpisodes.forEach(ep => {
    console.log(`Episode ${ep.episode_id} - attendees_who_listened:`, ep.attendees_who_listened);
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#403837" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Main Details */}
          <View style={styles.section}>
            {/* Location Title */}
            <Text style={[styles.locationTitle, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
              {meetup.location}
            </Text>
            {meetup.title && (
              <Text style={styles.subtitle}>{meetup.title}</Text>
            )}

            {/* Expandable Description */}
            {meetup.description && (
              <TouchableOpacity
                style={styles.descriptionContainer}
                onPress={() => setDescriptionExpanded(!descriptionExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.descriptionText} numberOfLines={descriptionExpanded ? undefined : 1}>
                  {meetup.description}
                </Text>
                {meetup.description.length > 60 && (
                  <Text style={styles.showMoreText}>
                    {descriptionExpanded ? 'Show less' : 'Show more'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Date & Time */}
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#E05F4E" />
              <Text style={styles.detailText}>{dateTime.time}, {format(parseISO(meetup.meetup_date), 'EEE MMM d')}</Text>
            </View>

            {/* Venue as Link */}
            <TouchableOpacity style={styles.detailRow} onPress={handleOpenMaps} activeOpacity={0.7}>
              <Ionicons name="location-outline" size={20} color="#E05F4E" />
              <Text style={styles.detailTextLink}>{meetup.venue}</Text>
            </TouchableOpacity>
          </View>

          {/* Related Episodes */}
          {validEpisodes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Episodes to discuss</Text>
              {validEpisodes.map((episode) => (
                <View key={episode.episode_id} style={styles.episodeCard}>
                  {episode.artwork_url && (
                    <Image source={{ uri: episode.artwork_url }} style={styles.episodeArtwork} />
                  )}
                  <View style={styles.episodeInfo}>
                    <Text style={styles.episodeTitle} numberOfLines={1}>
                      {episode.episode_title}
                    </Text>
                    <Text style={styles.podcastTitle} numberOfLines={1}>
                      {episode.podcast_title}
                    </Text>
                    {episode.attendees_who_listened && episode.attendees_who_listened.length > 0 && (
                      <View style={styles.listenersContainer}>
                        <View style={styles.listenersAvatars}>
                          {episode.attendees_who_listened.slice(0, 3).map((listener) => (
                            <Image
                              key={listener.user_id}
                              source={{
                                uri: listener.avatar_url || `https://ui-avatars.com/api/?name=${listener.username || 'User'}&background=E05F4E&color=fff`
                              }}
                              style={styles.listenerAvatar}
                            />
                          ))}
                        </View>
                        <Text style={styles.listenersText}>
                          {episode.attendees_who_listened.length === 1
                            ? '1 listened'
                            : `${episode.attendees_who_listened.length} attendees listened`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Attendees */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Attendees ({meetup.attendee_count})
              {userStatus === 'waitlist' && ' · You\'re on the waitlist'}
            </Text>
            <View style={styles.attendeesGrid}>
              {meetup.attendees.map((attendee) => (
                <View key={attendee.user_id} style={styles.attendeeItem}>
                  <Image
                    source={{
                      uri: attendee.avatar_url || `https://ui-avatars.com/api/?name=${attendee.username || 'User'}&background=E05F4E&color=fff`
                    }}
                    style={styles.attendeeAvatar}
                  />
                  <Text style={styles.attendeeName} numberOfLines={1}>
                    {attendee.username || 'Anonymous'}
                  </Text>
                </View>
              ))}
            </View>

            {meetup.spots_left > 0 ? (
              <View style={styles.spotsLeftBanner}>
                <Ionicons name="people" size={20} color="#E05F4E" />
                <Text style={styles.spotsLeftBannerText}>
                  {meetup.spots_left} {meetup.spots_left === 1 ? 'spot' : 'spots'} left
                </Text>
              </View>
            ) : (
              <View style={styles.fullBanner}>
                <Ionicons name="people" size={20} color="#8B8680" />
                <Text style={styles.fullBannerText}>This meetup is full</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {userStatus === 'confirmed' ? (
            <TouchableOpacity onPress={onLeave} style={styles.leaveButton}>
              <Text style={styles.leaveButtonText}>Leave Meetup</Text>
            </TouchableOpacity>
          ) : userStatus === 'waitlist' ? (
            <TouchableOpacity onPress={onLeave} style={styles.leaveButton}>
              <Text style={styles.leaveButtonText}>Leave Waitlist</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onJoin} style={styles.joinButton}>
              <Text style={styles.joinButtonText}>
                {meetup.spots_left > 0 ? 'Join Meetup' : 'Join Waitlist'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  locationTitle: {
    fontSize: 28,
    fontWeight: '400',
    color: '#E05F4E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#403837',
    fontWeight: '500',
    marginBottom: 8,
  },
  descriptionContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#8B8680',
    lineHeight: 20,
  },
  showMoreText: {
    fontSize: 14,
    color: '#E05F4E',
    fontWeight: '600',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#403837',
    fontWeight: '500',
    marginLeft: 12,
  },
  detailTextLink: {
    fontSize: 16,
    color: '#E05F4E',
    fontWeight: '500',
    marginLeft: 12,
    textDecorationLine: 'underline',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#403837',
    marginBottom: 16,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  episodeArtwork: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  episodeInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'flex-start',
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 4,
  },
  podcastTitle: {
    fontSize: 13,
    color: '#8B8680',
  },
  listenersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  listenersAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  listenerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F8F6F3',
    marginLeft: -8,
  },
  listenersText: {
    fontSize: 12,
    color: '#8B8680',
    fontWeight: '500',
  },
  attendeesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  attendeeItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 16,
  },
  attendeeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
  },
  attendeeName: {
    fontSize: 12,
    color: '#403837',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  noAttendeesText: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    paddingVertical: 20,
  },
  spotsLeftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F6',
    borderWidth: 1,
    borderColor: '#E05F4E',
    borderRadius: 12,
    padding: 12,
  },
  spotsLeftBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E05F4E',
    marginLeft: 8,
  },
  fullBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EDE9',
    borderRadius: 12,
    padding: 12,
  },
  fullBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B8680',
    marginLeft: 8,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EDE9',
  },
  joinButton: {
    backgroundColor: '#E05F4E',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leaveButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E05F4E',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E05F4E',
  },
});