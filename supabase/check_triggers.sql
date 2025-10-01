-- Check for any triggers on auth.users table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- Check for any functions that might be creating profiles
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname LIKE '%user%' 
OR proname LIKE '%profile%'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');