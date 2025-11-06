import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchedFriend {
  userId: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phoneNumber: string;
}

serve(async (req) => {
  console.log('match-contacts function called');
  console.log('Request method:', req.method);
  console.log('Authorization header:', req.headers.get('Authorization') ? 'Present' : 'Missing');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header value:', authHeader ? `${authHeader.substring(0, 20)}...` : 'null');

    if (!authHeader) {
      console.error('No Authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);

    // Create Supabase client with the auth context of the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log('Verifying user authentication...');

    // Verify the user is authenticated using the token directly
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    console.log('getUser result - user:', user ? user.id : 'null', 'error:', userError);

    if (userError || !user) {
      console.error('User authentication failed:', userError);
      console.error('Full error object:', JSON.stringify(userError, null, 2));
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message || 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Parse the request body to get phone numbers
    const { phoneNumbers } = await req.json();
    console.log('Received phone numbers count:', phoneNumbers?.length);

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      console.log('Invalid phoneNumbers:', phoneNumbers);
      return new Response(
        JSON.stringify({ error: 'phoneNumbers array is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Normalize phone numbers (remove spaces, dashes, etc.)
    const normalizedNumbers = phoneNumbers.map((phone: string) =>
      phone.replace(/[\s\-\(\)]/g, '')
    );
    console.log('Normalized numbers (first 3):', normalizedNumbers.slice(0, 3));

    // Create service role client for auth access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching all users from auth...');

    // Query auth.users for matching phone numbers
    // Note: This requires service role key as auth.users is not accessible via anon key
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching users:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Total users in system:', authUsers.users.length);

    // Filter users whose phone numbers match the contacts
    const matchedUserIds = authUsers.users
      .filter((authUser) => {
        if (!authUser.phone) return false;
        const normalizedUserPhone = authUser.phone.replace(/[\s\-\(\)]/g, '');
        return normalizedNumbers.includes(normalizedUserPhone);
      })
      .map((authUser) => ({
        userId: authUser.id,
        phoneNumber: authUser.phone!,
      }));

    console.log('Matched user IDs count:', matchedUserIds.length);

    if (matchedUserIds.length === 0) {
      console.log('No friends found, returning empty array');
      return new Response(
        JSON.stringify({ friends: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Fetching profiles for matched users...');

    // Get profile information for matched users
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .in('id', matchedUserIds.map(m => m.userId));

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Combine user IDs with profile data
    const friends: MatchedFriend[] = matchedUserIds.map((match) => {
      const profile = profiles?.find((p) => p.id === match.userId);
      return {
        userId: match.userId,
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        avatarUrl: profile?.avatar_url,
        phoneNumber: match.phoneNumber,
      };
    });

    // Filter out the current user from friends list
    const filteredFriends = friends.filter(f => f.userId !== user.id);

    return new Response(
      JSON.stringify({ friends: filteredFriends }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in match-contacts:', error);
    console.error('Error details:', JSON.stringify(error));
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
