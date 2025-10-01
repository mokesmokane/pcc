-- Check which tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS status for each table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if user_weekly_choices table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_weekly_choices'
) as user_weekly_choices_exists;

-- Check if episode_listener_stats view exists
SELECT EXISTS (
    SELECT FROM information_schema.views
    WHERE table_schema = 'public' 
    AND table_name = 'episode_listener_stats'
) as episode_listener_stats_exists;