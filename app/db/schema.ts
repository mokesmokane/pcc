import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 10, // Added location and bio to profiles
  tables: [
    tableSchema({
      name: 'user_episode_progress',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'current_position', type: 'number' },
        { name: 'total_duration', type: 'number' },
        { name: 'completed', type: 'boolean' },
        { name: 'last_played_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'weekly_selections',
      columns: [
        { name: 'week_start', type: 'string', isIndexed: true },
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'order_position', type: 'number' },
        // Denormalized episode data
        { name: 'episode_title', type: 'string' },
        { name: 'podcast_title', type: 'string' },
        { name: 'episode_description', type: 'string' },
        { name: 'audio_url', type: 'string' },
        { name: 'artwork_url', type: 'string', isOptional: true },
        { name: 'duration', type: 'number' },
        { name: 'category', type: 'string' },
        { name: 'published_at', type: 'string' },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'user_weekly_choices',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'week_start', type: 'string', isIndexed: true },
        { name: 'chosen_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'weekly_category_selections',
      columns: [
        { name: 'week_start', type: 'string', isIndexed: true },
        { name: 'category', type: 'string', isIndexed: true },
        { name: 'episode_id', type: 'string', isIndexed: true },
        // Denormalized episode data (same pattern as weekly_selections)
        { name: 'episode_title', type: 'string' },
        { name: 'podcast_title', type: 'string' },
        { name: 'episode_description', type: 'string' },
        { name: 'audio_url', type: 'string' },
        { name: 'artwork_url', type: 'string', isOptional: true },
        { name: 'duration', type: 'number' },
        { name: 'published_at', type: 'string' },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'comments',
      columns: [
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'content', type: 'string' },
        { name: 'parent_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'starter_id', type: 'string', isOptional: true, isIndexed: true },
        // Denormalized user data
        { name: 'username', type: 'string', isOptional: true },
        { name: 'avatar_url', type: 'string', isOptional: true },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'comment_reactions',
      columns: [
        { name: 'comment_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'emoji', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'profiles',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'username', type: 'string', isOptional: true },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'first_name', type: 'string', isOptional: true },
        { name: 'last_name', type: 'string', isOptional: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'bio', type: 'string', isOptional: true },
        // Onboarding preferences
        { name: 'struggles', type: 'string', isOptional: true }, // JSON array as string
        { name: 'interests', type: 'string', isOptional: true }, // JSON array as string
        { name: 'onboarding_completed', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'transcript_segments',
      columns: [
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'start_seconds', type: 'number' },
        { name: 'end_seconds', type: 'number' },
        { name: 'text', type: 'string' },
        { name: 'segment_index', type: 'number' },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'chapters',
      columns: [
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'start_seconds', type: 'number' },
        { name: 'end_seconds', type: 'number', isOptional: true },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'members',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'first_name', type: 'string', isOptional: true },
        { name: 'last_name', type: 'string', isOptional: true },
        { name: 'username', type: 'string', isOptional: true },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'progress', type: 'number' },
        { name: 'has_finished', type: 'boolean' },
        { name: 'comment_count', type: 'number' },
        { name: 'last_activity', type: 'number' },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'meetups',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'location', type: 'string' },
        { name: 'venue', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'meetup_date', type: 'string' },
        { name: 'meetup_time', type: 'string' },
        { name: 'spaces', type: 'number' },
        { name: 'organizer_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'status', type: 'string' },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'episode_meetups',
      columns: [
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'meetup_id', type: 'string', isIndexed: true },
        { name: 'relevance_note', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'meetup_attendees',
      columns: [
        { name: 'meetup_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' },
        // Denormalized user data
        { name: 'username', type: 'string', isOptional: true },
        { name: 'avatar_url', type: 'string', isOptional: true },
        // Timestamps
        { name: 'joined_at', type: 'number' },
        { name: 'cancelled_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'episode_details',
      columns: [
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'about', type: 'string' },
        { name: 'why_we_love_it', type: 'string' },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'message', type: 'string' },
        { name: 'is_read', type: 'boolean', isIndexed: true },
        { name: 'related_user_id', type: 'string', isOptional: true },
        { name: 'related_entity_id', type: 'string', isOptional: true },
        { name: 'related_entity_type', type: 'string', isOptional: true },
        { name: 'action_url', type: 'string', isOptional: true },
        { name: 'metadata', type: 'string', isOptional: true },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'discussion_questions',
      columns: [
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'question', type: 'string' },
        { name: 'question_type', type: 'string' },
        { name: 'order_position', type: 'number' },
        { name: 'image_url', type: 'string', isOptional: true },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'discussion_options',
      columns: [
        { name: 'question_id', type: 'string', isIndexed: true },
        { name: 'value', type: 'number' },
        { name: 'label', type: 'string' },
        { name: 'emoji', type: 'string', isOptional: true },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'order_position', type: 'number' },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'user_discussion_responses',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'question_id', type: 'string', isIndexed: true },
        { name: 'option_value', type: 'number' },
        { name: 'response_type', type: 'string' }, // 'agree' or 'disagree'
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'conversation_starters',
      columns: [
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'question', type: 'string' },
        { name: 'order_position', type: 'number' },
        { name: 'image_url', type: 'string', isOptional: true },
        // Timestamps and sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
      ],
    }),
  ],
});