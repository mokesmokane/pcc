-- Check if RLS is actually disabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Check what policies exist (should be none if RLS is disabled)
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Check if the user exists
SELECT id, email, created_at 
FROM auth.users 
WHERE id = 'ebe6436f-1d12-4a7c-9dd9-2f76c0feec22';

-- Check if profile exists
SELECT * FROM profiles 
WHERE id = 'ebe6436f-1d12-4a7c-9dd9-2f76c0feec22';

-- Try to insert a test profile directly
INSERT INTO profiles (id, username) 
VALUES ('ebe6436f-1d12-4a7c-9dd9-2f76c0feec22', 'testuser')
ON CONFLICT (id) DO NOTHING
RETURNING *;