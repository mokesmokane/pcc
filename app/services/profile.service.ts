import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';

export interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

class ProfileService {
  /**
   * Get user profile by user ID - creates one if it doesn't exist
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      // First try to get existing profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // If profile doesn't exist, create one
      if (error && error.code === 'PGRST116') {
        console.log('Profile not found, creating new profile for user:', userId);

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          return null;
        }

        return newProfile;
      }

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getProfile:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return false;
    }
  }

  /**
   * Upload avatar image to Supabase Storage
   */
  async uploadAvatar(userId: string, imageUri: string): Promise<string | null> {
    try {
      // If it's already a remote URL (like dicebear avatars), just return it
      if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
        return imageUri;
      }

      // Otherwise, try to upload local image
      // Get the image as base64
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Read the blob as base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove the data:image/jpeg;base64, prefix
          const base64String = base64data.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Generate unique filename - put in user's folder
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to Supabase Storage
      console.log('Uploading to path:', filePath);
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: false  // Don't upsert, create new file each time
        });

      if (error) {
        console.error('Error uploading avatar:', error);
        console.error('Error details:', error.message);
        // If it's an RLS error, try without user folder
        if (error.message?.includes('row-level security')) {
          const simplePath = `${Date.now()}.jpg`;
          console.log('Retrying with simple path:', simplePath);
          const { data: retryData, error: retryError } = await supabase.storage
            .from('avatars')
            .upload(simplePath, decode(base64), {
              contentType: 'image/jpeg',
            });

          if (retryError) {
            console.error('Retry also failed:', retryError);
            return null;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(simplePath);

          return publicUrl;
        }
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadAvatar:', error);
      return null;
    }
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('username', username);

      // Exclude current user if updating
      if (currentUserId) {
        query = query.neq('id', currentUserId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking username:', error);
        return false;
      }

      return !data || data.length === 0;
    } catch (error) {
      console.error('Error in isUsernameAvailable:', error);
      return false;
    }
  }

  /**
   * Create or update full profile
   */
  async saveProfile(
    userId: string,
    username: string | null,
    avatarUri?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check username availability if provided
      if (username) {
        const isAvailable = await this.isUsernameAvailable(username, userId);
        if (!isAvailable) {
          return { success: false, error: 'Username is already taken' };
        }
      }

      let avatarUrl: string | null = null;

      // Upload avatar if provided
      if (avatarUri) {
        avatarUrl = await this.uploadAvatar(userId, avatarUri);
        if (!avatarUrl) {
          return { success: false, error: 'Failed to upload avatar' };
        }
      }

      // Prepare update data
      const updateData: any = {
        username,
        updated_at: new Date().toISOString(),
      };

      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...updateData,
        });

      if (error) {
        console.error('Error saving profile:', error);
        return { success: false, error: 'Failed to save profile' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in saveProfile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

export const profileService = new ProfileService();