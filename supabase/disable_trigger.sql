-- Drop the trigger that's auto-creating profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Also drop the function if you don't need it
DROP FUNCTION IF EXISTS handle_new_user();