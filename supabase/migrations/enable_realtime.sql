-- =====================================================
-- Realtime Setup for Podcast Club
-- =====================================================
-- This migration enables Realtime for:
-- 1. Weekly Selections (Postgres Changes - public data)
-- 2. Chapters (Postgres Changes - admin content)
-- 3. Episode Details (Postgres Changes - admin content)
-- 4. Transcript Segments (Postgres Changes - admin content)
-- 5. Notifications (Broadcast - user-specific data)
-- =====================================================

-- =====================================================
-- PART 1: Admin-Controlled Content (Postgres Changes)
-- =====================================================
-- Enable Postgres Changes for admin-managed tables
-- This allows direct subscription to table changes
-- Safe for public data with low change frequency

-- Weekly Selections (admin curated lineup)
ALTER PUBLICATION supabase_realtime ADD TABLE weekly_selections;
ALTER TABLE weekly_selections REPLICA IDENTITY FULL;

-- Chapters (admin-created chapter markers)
ALTER PUBLICATION supabase_realtime ADD TABLE chapters;
ALTER TABLE chapters REPLICA IDENTITY FULL;

-- Episode Details (admin editorial content)
ALTER PUBLICATION supabase_realtime ADD TABLE episode_details;
ALTER TABLE episode_details REPLICA IDENTITY FULL;

-- Transcript Segments (admin-managed transcripts)
ALTER PUBLICATION supabase_realtime ADD TABLE transcript_segments;
ALTER TABLE transcript_segments REPLICA IDENTITY FULL;

-- =====================================================
-- PART 2: Notifications (Broadcast Method)
-- =====================================================

-- Step 1: Create RLS policy for Broadcast authorization
-- This allows authenticated users to receive broadcast messages
-- Drop existing policy if it exists, then create new one
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON "realtime"."messages";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Authenticated users can receive broadcasts"
ON "realtime"."messages"
FOR SELECT
TO authenticated
USING (true);

-- Step 2: Create trigger function for notifications
-- Broadcasts to user-specific channel: notifications:{user_id}
CREATE OR REPLACE FUNCTION public.broadcast_notification_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Broadcast to user-specific channel
  -- Channel format: notifications:{user_id}
  PERFORM realtime.broadcast_changes(
    'notifications:' || COALESCE(NEW.user_id, OLD.user_id)::text, -- topic
    TG_OP,                                                          -- event (INSERT/UPDATE/DELETE)
    TG_OP,                                                          -- operation
    TG_TABLE_NAME,                                                  -- table name
    TG_TABLE_SCHEMA,                                                -- schema
    NEW,                                                            -- new record
    OLD                                                             -- old record
  );
  RETURN NULL;
END;
$$;

-- Step 3: Create trigger on notifications table
-- Fires after INSERT, UPDATE, or DELETE
CREATE TRIGGER handle_notification_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION broadcast_notification_changes();

-- =====================================================
-- Verification Queries (run separately to verify)
-- =====================================================

-- Check all tables are in realtime publication:
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
-- ORDER BY tablename;
-- Expected: weekly_selections, chapters, episode_details, transcript_segments

-- Check replica identity is FULL for all tables:
-- SELECT relname, relreplident
-- FROM pg_class
-- WHERE relname IN ('weekly_selections', 'chapters', 'episode_details', 'transcript_segments')
-- AND relreplident = 'f';
-- Expected: All 4 tables with relreplident = 'f' (FULL)

-- Check notification trigger exists:
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name = 'handle_notification_changes';

-- Check RLS policy exists:
-- SELECT policyname, tablename, cmd
-- FROM pg_policies
-- WHERE tablename = 'messages' AND schemaname = 'realtime';
