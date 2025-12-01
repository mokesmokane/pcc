import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import WeeklySelection from '../data/models/weekly-selection.model';
import WeeklyCategorySelection from '../data/models/weekly-category-selection.model';
import UserWeeklyChoice from '../data/models/user-weekly-choice.model';
import UserEpisodeProgress from '../models/UserEpisodeProgress';
import Profile from '../data/models/profile.model';
import Comment from '../data/models/comment.model';
import CommentReaction from '../data/models/comment-reaction.model';
import TranscriptSegment from '../data/models/transcript-segment.model';
import Chapter from '../data/models/chapter.model';
import Member from '../data/models/member.model';
import Meetup from '../data/models/meetup.model';
import MeetupAttendee from '../data/models/meetup-attendee.model';
import EpisodeMeetup from '../data/models/episode-meetup.model';
import EpisodeDetails from '../data/models/episode-details.model';
import Notification from '../data/models/notification.model';
import DiscussionQuestion from '../data/models/discussion-question.model';
import DiscussionOption from '../data/models/discussion-option.model';
import UserDiscussionResponse from '../data/models/user-discussion-response.model';
import ConversationStarter from '../data/models/conversation-starter.model';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'pcc_database_v20', // Added weekly_category_selections for wild card
  jsi: false,
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

const database = new Database({
  adapter,
  modelClasses: [
    WeeklySelection,
    WeeklyCategorySelection,
    UserWeeklyChoice,
    UserEpisodeProgress,
    Profile,
    Comment,
    CommentReaction,
    TranscriptSegment,
    Chapter,
    Member,
    Meetup,
    MeetupAttendee,
    EpisodeMeetup,
    EpisodeDetails,
    Notification,
    DiscussionQuestion,
    DiscussionOption,
    UserDiscussionResponse,
    ConversationStarter,
  ],
});

export default database;