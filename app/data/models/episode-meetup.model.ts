import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export default class EpisodeMeetup extends Model {
  static table = 'episode_meetups';
  static associations = {
    meetups: { type: 'belongs_to', key: 'meetup_id' },
  };

  @field('episode_id') episodeId!: string;
  @field('meetup_id') meetupId!: string;
  @field('relevance_note') relevanceNote?: string;

  // Timestamp
  @readonly @date('created_at') createdAt!: Date;

  // Relations
  @relation('meetups', 'meetup_id') meetup!: any;
}