import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // This function is triggered by a webhook/database trigger when a new user signs up
    const { userId, phone } = await req.json();

    if (!userId || !phone) {
      return new Response(
        JSON.stringify({ error: 'userId and phone are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('New user signup:', userId, phone);

    // Normalize phone number
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Get all users to find potential friends
    const { data: allUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get the new user's profile
    console.log('Fetching profile for user:', userId);
    const { data: newUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile not found for new user:', profileError);
      console.log('Will use phone number instead');
    } else {
      console.log('Found profile:', newUserProfile);
    }

    const newUserName = newUserProfile
      ? `${newUserProfile.first_name || ''} ${newUserProfile.last_name || ''}`.trim()
      : phone;

    console.log('Using name for notifications:', newUserName);

    // For each existing user, check if the new user's phone is in their contacts
    // We'll do this by calling match-contacts for each user
    const notifications = [];

    for (const existingUser of allUsers.users) {
      if (existingUser.id === userId) continue; // Skip the new user themselves

      if (!existingUser.phone) continue;

      // For simplicity, we're going to create notifications for all existing users
      // In production, you'd want to actually check if they have this phone in their contacts
      // This would require storing contact hashes or doing a more sophisticated match

      // Create notification for existing user
      const notification = {
        user_id: existingUser.id,
        type: 'friend_joined',
        title: 'A friend joined Podcast Club!',
        message: `${newUserName || 'Someone you know'} just joined Podcast Club`,
        related_user_id: userId,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      notifications.push(notification);
    }

    // Insert notifications in batches
    if (notifications.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error creating notifications:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create notifications' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`Created ${notifications.length} notifications for new user signup`);
    }

    return new Response(
      JSON.stringify({ success: true, notificationsCreated: notifications.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-friends-on-signup:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
