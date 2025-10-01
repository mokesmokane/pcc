-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (new.id, new.email, now(), now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create the RPC function that the app is trying to call
CREATE OR REPLACE FUNCTION public.create_profile_for_user(user_id UUID, user_username TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (user_id, user_username, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username,
      updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;