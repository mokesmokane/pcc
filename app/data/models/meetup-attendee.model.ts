import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export default class MeetupAttendee extends Model {
  static table = 'meetup_attendees';
  static associations = {
    meetups: { type: 'belongs_to', key: 'meetup_id' },
  };

  @field('meetup_id') meetupId!: string;
  @field('user_id') userId!: string;
  @field('status') status!: 'confirmed' | 'cancelled' | 'waitlist';

  // Denormalized user data
  @field('username') username?: string;
  @field('avatar_url') avatarUrl?: string;

  // Timestamps
  @field('joined_at') joinedAt!: number;
  @field('cancelled_at') cancelledAt?: number;

  // Relations
  @relation('meetups', 'meetup_id') meetup!: any;
}