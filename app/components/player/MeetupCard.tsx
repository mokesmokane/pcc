import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { format, parseISO } from 'date-fns';

interface MeetupCardProps {
  id: string;
  location: string;
  meetupDate: string;
  meetupTime: string;
  venue: string;
  address: string;
  attendees: {
    user_id: string;
    avatar_url?: string;
    username?: string;
  }[];
  attendeeCount: number;
  spotsLeft: number;
  userStatus?: 'confirmed' | 'waitlist' | null;
  onPress?: () => void;
  onJoin?: () => void;
  onLeave?: () => void;
}

export function MeetupCard({
  location,
  meetupDate,
  meetupTime,
  venue,
  attendees = [],
  attendeeCount,
  spotsLeft,
  userStatus,
  onPress,
  onJoin,
  onLeave,
}: MeetupCardProps) {
  // Format date and time
  const formatMeetupDateTime = () => {
    try {
      const date = parseISO(meetupDate);
      const [hours, minutes] = meetupTime.split(':');
      date.setHours(parseInt(hours), parseInt(minutes));

      // Format as "10am, Sun 3 Oct"
      const timeStr = format(date, 'ha').toLowerCase();
      const dateStr = format(date, 'EEE d MMM');
      return `${timeStr}, ${dateStr}`;
    } catch {
      return `${meetupTime}, ${meetupDate}`;
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.mainContent}>
        {/* Location Icon Column */}
        <View style={styles.iconColumn}>
          <Ionicons name="location" size={24} color="#E05F4E" />
        </View>

        {/* Content Column */}
        <View style={styles.contentColumn}>
          <View style={styles.header}>
            <Text style={styles.locationText}>{location}</Text>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={20} color="#8B8680" />
            </TouchableOpacity>
          </View>

          <Text style={styles.timeText}>{formatMeetupDateTime()}</Text>
          <View style={styles.venueContainer}>
            <Text style={styles.venueText}>{venue}</Text>
          </View>

          <View style={styles.attendeesContainer}>
            {attendees.length > 0 && (
              <View style={styles.avatarsContainer}>
                {attendees.slice(0, 6).map((attendee, index) => (
                  <Image
                    key={attendee.user_id}
                    source={{ uri: attendee.avatar_url || `https://ui-avatars.com/api/?name=${attendee.username || 'User'}&background=E05F4E&color=fff` }}
                    style={[
                      styles.avatar,
                      {
                        marginLeft: index === 0 ? 0 : -12,
                        zIndex: 6 - index,
                      },
                    ]}
                  />
                ))}
              </View>
            )}
            <Text style={styles.attendeesText}>
              {attendeeCount} attending
              {userStatus === 'waitlist' && ' (waitlist)'}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            {spotsLeft > 0 ? (
              <View style={styles.spotsLeftPill}>
                <Text style={styles.spotsLeftText}>Only {spotsLeft} spots left</Text>
              </View>
            ) : (
              <View style={styles.fullPill}>
                <Text style={styles.fullText}>Full</Text>
              </View>
            )}

            {userStatus === 'confirmed' ? (
              <TouchableOpacity onPress={onLeave} style={styles.leaveButton}>
                <Text style={styles.leaveButtonText}>Leave</Text>
              </TouchableOpacity>
            ) : userStatus === 'waitlist' ? (
              <TouchableOpacity onPress={onLeave} style={styles.waitlistButton}>
                <Text style={styles.waitlistButtonText}>Leave waitlist</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onJoin} style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  mainContent: {
    flexDirection: 'row',
  },
  iconColumn: {
    width: 40,
    alignItems: 'center',
    paddingTop: 2,
  },
  contentColumn: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#403837',
  },
  timeText: {
    fontSize: 14,
    color: '#8B8680',
    marginBottom: 2,
  },
  venueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  venueText: {
    fontSize: 14,
    color: '#8B8680',
    flex: 1,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  attendeesText: {
    fontSize: 13,
    color: '#403837',
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotsLeftPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E05F4E',
    backgroundColor: '#FFF8F6',
  },
  spotsLeftText: {
    fontSize: 12,
    color: '#E05F4E',
    fontWeight: '600',
  },
  fullPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#8B8680',
  },
  fullText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  joinButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E05F4E',
  },
  joinButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  leaveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E05F4E',
  },
  leaveButtonText: {
    fontSize: 14,
    color: '#E05F4E',
    fontWeight: '600',
  },
  waitlistButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8B8680',
  },
  waitlistButtonText: {
    fontSize: 14,
    color: '#8B8680',
    fontWeight: '600',
  },
});