# Realtime Setup Guide

## Overview

This app uses two different Supabase Realtime methods optimized for their use cases:

1. **Postgres Changes** for admin-controlled content (public data, low frequency)
   - `weekly_selections` - Weekly lineup curation
   - `chapters` - Episode chapter markers
   - `episode_details` - Editorial content (about, why we love it)
   - `transcript_segments` - Episode transcripts
2. **Broadcast** for `notifications` (user-specific data, scalable)

## Why Two Methods?

### Postgres Changes (Admin Content)
- ✅ Simple setup, no triggers needed
- ✅ Perfect for public data that all users see
- ✅ Low RLS overhead (public access)
- ✅ Low change frequency (admin updates)
- ✅ All admin content gets instant push updates

### Broadcast (Notifications)
- ✅ Scalable - each user has their own channel
- ✅ No RLS overhead on change events
- ✅ User-specific data handled efficiently
- ✅ Channel format: `notifications:{user_id}`

## Setup Instructions

### 1. Run the Migration

Run this SQL in your Supabase SQL Editor:

```bash
# If using Supabase CLI
supabase db push

# Or copy/paste the content of:
# /supabase/migrations/enable_realtime.sql
```

The migration will:
- Enable Postgres Changes for `weekly_selections`, `chapters`, `episode_details`, `transcript_segments`
- Set REPLICA IDENTITY FULL on all Realtime tables
- Create broadcast RLS policy for authenticated users
- Create trigger function for notifications
- Attach trigger to notifications table

### 2. Verify Setup

Run these verification queries in Supabase SQL Editor:

```sql
-- Check all admin content tables are in realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
-- Should show: chapters, episode_details, transcript_segments, weekly_selections

-- Check replica identity is FULL for all tables
SELECT relname, relreplident
FROM pg_class
WHERE relname IN ('weekly_selections', 'chapters', 'episode_details', 'transcript_segments')
AND relreplident = 'f';
-- Should show all 4 tables with relreplident = 'f' (FULL)

-- Check notification trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'handle_notification_changes';
-- Should show: handle_notification_changes | INSERT, UPDATE, DELETE | notifications

-- Check RLS policy for broadcasts
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE tablename = 'messages' AND schemaname = 'realtime';
-- Should show: "Authenticated users can receive broadcasts"
```

### 3. Client-Side Setup

The RealtimeManager is automatically initialized in `DatabaseContext.tsx`:
- Subscribes to weekly selections (Postgres Changes)
- Subscribes to chapters (Postgres Changes)
- Subscribes to episode details (Postgres Changes)
- Subscribes to transcript segments (Postgres Changes)
- Subscribes to user-specific notifications (Broadcast)
- Handles cleanup on unmount

No additional client code needed!

## Testing

### Test Weekly Selections (Postgres Changes)

1. **Open your app** (make sure you're logged in)
2. **Watch console logs** for:
   ```
   🔌 Initializing Realtime subscriptions...
   ✅ Subscribed to Postgres Changes: weekly_selections
   ```
3. **In Supabase Dashboard**, insert a new weekly selection:
   ```sql
   INSERT INTO weekly_selections (week_start, episode_id, order_position)
   VALUES ('2025-10-21', '<some-episode-id>', 1);
   ```
4. **In app console**, you should see:
   ```
   🔔 Postgres Changes: weekly_selections { eventType: 'INSERT', ... }
   ✅ Updated weekly selection: <id>
   ```

### Test Notifications (Broadcast)

1. **Open your app** (make sure you're logged in)
2. **Watch console logs** for:
   ```
   🔌 Initializing Realtime subscriptions...
   ✅ Subscribed to notifications broadcast: notifications:{your-user-id}
   ```
3. **In Supabase Dashboard**, insert a notification:
   ```sql
   INSERT INTO notifications (user_id, type, title, message, is_read)
   VALUES (
     '<your-user-id>',
     'friend_request',
     'New Friend Request',
     'Someone wants to connect with you',
     false
   );
   ```
4. **In app console**, you should see:
   ```
   🔔 New notification broadcast: { ... }
   ✅ Notification broadcast INSERT: <id>
   ```
5. **Check your app** - notification should appear instantly!

### Test Chapters (Postgres Changes)

1. **Open your app** and navigate to an episode with chapters
2. **Watch console logs** for:
   ```
   ✅ Subscribed to Postgres Changes: chapters
   ```
3. **In Supabase Dashboard**, update a chapter:
   ```sql
   UPDATE chapters
   SET title = 'Updated Chapter Title'
   WHERE id = '<chapter-id>';
   ```
4. **In app console**, you should see:
   ```
   🔔 Postgres Changes: chapters { eventType: 'UPDATE', ... }
   ✅ Updated chapter: <id> for episode <episode-id>
   ```
5. **Check your app** - chapter title should update instantly!

### Test Episode Details (Postgres Changes)

1. **Open your app** and view an episode's details page
2. **Watch console logs** for:
   ```
   ✅ Subscribed to Postgres Changes: episode_details
   ```
3. **In Supabase Dashboard**, update episode details:
   ```sql
   UPDATE episode_details
   SET about = 'This is an updated episode description',
       why_we_love_it = 'Updated reasons why we love this episode'
   WHERE episode_id = '<episode-id>';
   ```
4. **In app console**, you should see:
   ```
   🔔 Postgres Changes: episode_details { eventType: 'UPDATE', ... }
   ✅ Updated episode details for episode <episode-id>
   ```
5. **Check your app** - episode details should update instantly!

### Test Transcript Segments (Postgres Changes)

1. **Open your app** and view an episode's transcript
2. **Watch console logs** for:
   ```
   ✅ Subscribed to Postgres Changes: transcript_segments
   ```
3. **In Supabase Dashboard**, update a transcript segment:
   ```sql
   UPDATE transcript_segments
   SET text = 'This is the corrected transcript text'
   WHERE id = '<segment-id>';
   ```
4. **In app console**, you should see:
   ```
   🔔 Postgres Changes: transcript_segments { eventType: 'UPDATE', ... }
   ✅ Updated transcript segment: <id> for episode <episode-id>
   ```
5. **Check your app** - transcript should update instantly!

## Troubleshooting

### No Updates for Admin Content Tables

```sql
-- Verify all tables are in publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- Should show: weekly_selections, chapters, episode_details, transcript_segments

-- If any are missing, run:
ALTER PUBLICATION supabase_realtime ADD TABLE <table_name>;
ALTER TABLE <table_name> REPLICA IDENTITY FULL;

-- Example for chapters:
ALTER PUBLICATION supabase_realtime ADD TABLE chapters;
ALTER TABLE chapters REPLICA IDENTITY FULL;
```

### No Notification Broadcasts

```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'handle_notification_changes';

-- Check RLS policy exists
SELECT * FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'realtime';

-- If missing, re-run the migration
```

### Console Shows "No authenticated user"

```
⚠️ No authenticated user, skipping Realtime initialization
```

**Solution:** Make sure user is logged in before DatabaseContext mounts.

### Channel Connection Errors

```
❌ Error subscribing to notifications broadcast
```

**Possible causes:**
1. RLS policy not set up correctly
2. User not authenticated
3. `supabase.realtime.setAuth()` not called

**Check console for:**
```
✅ Subscribed to notifications broadcast: notifications:{user-id}
```

## Architecture Notes

### Why Not Use Postgres Changes for Everything?

From Supabase docs:
> "If you have 100 users subscribed to a table where you make a single insert, it will trigger 100 'reads': one for each user."

**For user-specific data like notifications**, this doesn't scale:
- 100 users online = 100 RLS checks per notification
- Single-threaded processing = bottleneck
- Database CPU becomes the limit

**Broadcast solves this:**
- User subscribes to `notifications:{userId}`
- Trigger broadcasts to that specific channel
- No RLS overhead on the change event
- Horizontal scaling through channel isolation

### Performance Comparison

| Method | Use Case | RLS Overhead | Scalability | Setup Complexity |
|--------|----------|--------------|-------------|------------------|
| Postgres Changes | Public data | Low (public access) | Good | Simple |
| Broadcast | User-specific | None | Excellent | Medium |

## What's Covered

**✅ Admin-Controlled Content (Postgres Changes):**
- `weekly_selections` - Weekly lineup curation
- `chapters` - Episode chapter markers
- `episode_details` - Editorial content
- `transcript_segments` - Episode transcripts

**✅ User-Specific Content (Broadcast):**
- `notifications` - User notifications

**❌ Not Using Realtime (Cache + Pull Pattern):**
- `comments` - High-frequency user-generated content (5-min cache)
- `progress` - Very high-frequency updates (batched syncs)
- `members` - Derived data from expensive view (5-min cache)
- `profile` - Low-frequency updates (1-hour cache)

## Future Considerations

If you need Realtime for other tables:

**User-specific data** (comments, reactions, etc.):
- Consider **Broadcast** if you need real-time collaboration
- Current cache + pull pattern works well for most use cases
- Evaluate if the added complexity is worth it

## Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Postgres Changes Guide](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Broadcast Guide](https://supabase.com/docs/guides/realtime/broadcast)
- [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
