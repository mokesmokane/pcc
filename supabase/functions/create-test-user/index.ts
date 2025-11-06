import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('create-test-user function called');
  console.log('Request method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Creating Supabase admin client...');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Parsing request body...');
    const body = await req.json();
    console.log('Request body:', body);

    const { phone, firstName, lastName, avatarUrl } = body;

    if (!phone) {
      console.error('No phone number provided');
      return new Response(
        JSON.stringify({ error: 'phone is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Creating test user with phone:', phone);

    // Normalize phone number to E.164 format
    // Remove all non-digit characters except the leading +
    let normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, '');

    // Ensure it starts with +
    if (!normalizedPhone.startsWith('+')) {
      // If it doesn't start with +, assume it's a UK number and add +44
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+44' + normalizedPhone.substring(1);
      } else {
        normalizedPhone = '+' + normalizedPhone;
      }
    }

    console.log('Normalized phone:', normalizedPhone);

    // Check if user already exists
    console.log('Checking if user exists...');
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: `Failed to check existing users: ${listError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Total users in system:', existingUsers?.users.length);
    const userExists = existingUsers?.users.some(u => u.phone === normalizedPhone);

    if (userExists) {
      console.log('User already exists with phone:', normalizedPhone);
      return new Response(
        JSON.stringify({ error: 'User with this phone already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create user with admin API
    console.log('Creating user via admin API...');
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      phone: normalizedPhone,
      phone_confirm: true, // Skip OTP verification for test users
      user_metadata: {
        first_name: firstName || '',
        last_name: lastName || '',
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      console.error('Create error details:', JSON.stringify(createError, null, 2));
      return new Response(
        JSON.stringify({ error: createError.message || 'Failed to create user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('User created successfully:', newUser.user?.id);

    // Wait a moment to ensure user is fully created
    await new Promise(resolve => setTimeout(resolve, 200));

    // Create profile for the user
    const profileData = {
      id: newUser.user!.id,
      first_name: firstName || '',
      last_name: lastName || '',
      avatar_url: avatarUrl || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('Creating profile with data:', profileData);

    const { data: insertedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(profileData)
      .select();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      console.error('Profile error details:', JSON.stringify(profileError, null, 2));

      // Try to update instead if insert failed
      console.log('Attempting to update existing profile...');
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name: firstName || '',
          last_name: lastName || '',
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', newUser.user!.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
      } else {
        console.log('Profile updated successfully');
      }
    } else {
      console.log('Profile created successfully:', insertedProfile);
    }

    // Wait a moment to ensure profile is fully committed
    await new Promise(resolve => setTimeout(resolve, 500));

    // Trigger friend notifications
    try {
      console.log('Triggering friend notifications...');
      const { data: notifyData, error: notifyError } = await supabaseAdmin.functions.invoke('notify-friends-on-signup', {
        body: {
          userId: newUser.user!.id,
          phone: normalizedPhone,
        },
      });

      if (notifyError) {
        console.error('Error sending friend notifications:', notifyError);
      } else {
        console.log('Friend notifications sent:', notifyData);
      }
    } catch (notifyError) {
      console.error('Error sending friend notifications:', notifyError);
      // Don't fail the request if notifications fail
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.user!.id,
        phone: normalizedPhone,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in create-test-user:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
