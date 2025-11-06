import { Model } from '@nozbe/watermelondb';
import { children, date, field, lazy, readonly } from '@nozbe/watermelondb/decorators';
import { Q } from '@nozbe/watermelondb';

export default class Meetup extends Model {
  static table = 'meetups';
  static associations = {
    meetup_attendees: { type: 'has_many', foreignKey: 'meetup_id' },
    episode_meetups: { type: 'has_many', foreignKey: 'meetup_id' },
  };

  @field('title') title!: string;
  @field('description') description?: string;
  @field('location') location!: string;
  @field('venue') venue!: string;
  @field('address') address!: string;
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @field('meetup_date') meetupDate!: string;
  @field('meetup_time') meetupTime!: string;
  @field('spaces') spaces!: number;
  @field('organizer_id') organizerId?: string;
  @field('status') status!: string;

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;

  // Relations
  @children('meetup_attendees') attendees!: any;
  @children('episode_meetups') episodeMeetups!: any;

  // Computed properties
  @lazy attendeeCount = this.collections
    .get('meetup_attendees')
    .query(
      Q.where('meetup_id', this.id),
      Q.where('status', 'confirmed')
    )
    .fetchCount();

  @lazy spotsLeft = this.attendeeCount.then(count =>
    Math.max(0, this.spaces - count)
  );

  @lazy relatedEpisodes = this.collections
    .get('episode_meetups')
    .query(Q.where('meetup_id', this.id))
    .fetch();
}