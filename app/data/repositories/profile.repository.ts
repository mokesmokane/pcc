import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { BaseRepository } from './base.repository';
import Profile from '../models/profile.model';
import { supabase } from '../../lib/supabase';

export class ProfileRepository extends BaseRepository<Profile> {
  constructor(database: Database) {
    super(database, 'profiles');
  }

  async upsertFromRemote(remoteData: any): Promise<Profile> {
    const existing = await this.findByUserId(remoteData.id || remoteData.user_id);

    const flatData = {
      user_id: remoteData.id || remoteData.user_id,
      username: remoteData.username,
      avatar_url: remoteData.avatar_url,
      first_name: remoteData.first_name,
      last_name: remoteData.last_name,
      synced_at: Date.now(),
      needs_sync: false,
    };

    if (existing) {
      return await this.update(existing.id, flatData as any);
    } else {
      return await this.create({
        id: remoteData.id || remoteData.user_id,
        ...flatData,
      } as any);
    }
  }

  async markForSync(id: string): Promise<void> {
    await this.update(id, { needsSync: true } as any);
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    const profiles = await this.query([Q.where('user_id', userId)]);
    return profiles.length > 0 ? profiles[0] : null;
  }

  async getCurrentUserProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    await this.syncCurrentUserProfile();

    const profile = await this.findByUserId(user.id);

    return profile;
  }

  async updateProfile(
    userId: string,
    username: string | null,
    avatarUrl: string | null,
    firstName?: string | null,
    lastName?: string | null
  ): Promise<Profile | null> {
    const profile = await this.findByUserId(userId);

    if (!profile) {
      // Create new profile
      return await this.create({
        user_id: userId,
        username,
        avatar_url: avatarUrl,
        first_name: firstName,
        last_name: lastName,
        needs_sync: true,
      } as any);
    } else {
      // Update existing
      const updated = await this.update(profile.id, {
        username,
        avatar_url: avatarUrl,
        first_name: firstName,
        last_name: lastName,
        needs_sync: true,
      } as any);

      // Sync to remote in background
      this.syncProfile(userId).catch(console.error);

      return updated;
    }
  }

  async syncCurrentUserProfile(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        await this.upsertFromRemote(data);
      } else if (error?.code === 'PGRST116') {
        // No profile exists, create one
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: null,
            avatar_url: null,
          })
          .select()
          .single();

        if (newProfile) {
          await this.upsertFromRemote(newProfile);
        }
      }
    } catch (error) {
      console.error('Failed to sync user profile:', error);
    }
  }

  async syncProfile(userId: string): Promise<void> {
    const profile = await this.findByUserId(userId);
    if (!profile || !profile.needsSync) return;

    try {
      // Handle avatar upload if it's a local URI
      let avatarUrl = profile.avatarUrl;
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        avatarUrl = await this.uploadAvatar(userId, avatarUrl);
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: profile.username,
          avatar_url: avatarUrl,
          first_name: profile.firstName,
          last_name: profile.lastName,
          updated_at: new Date().toISOString(),
        });

      if (!error) {
        await this.update(profile.id, {
          avatar_url: avatarUrl, // Update with remote URL
          needs_sync: false,
          synced_at: Date.now(),
        } as any);
      }
    } catch (error) {
      console.error('Failed to sync profile:', error);
    }
  }

  private async uploadAvatar(userId: string, localUri: string): Promise<string | null> {
    try {
      // If it's already a remote URL, return as is
      if (localUri.startsWith('http')) return localUri;

      // Upload to Supabase Storage
      const response = await fetch(localUri);
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

      // Import decode function
      const { decode } = await import('base64-arraybuffer');

      const fileExt = localUri.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      console.log('Uploading avatar to:', filePath);

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error);
        // Try without user folder
        const simplePath = `${Date.now()}.jpg`;
        const { data: retryData, error: retryError } = await supabase.storage
          .from('avatars')
          .upload(simplePath, decode(base64), {
            contentType: 'image/jpeg',
          });

        if (retryError) {
          console.error('Retry also failed:', retryError);
          throw retryError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(simplePath);

        return publicUrl;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      return null;
    }
  }

  async pushLocalChanges(): Promise<void> {
    const needsSync = await this.query([Q.where('needs_sync', true)]);

    for (const profile of needsSync) {
      await this.syncProfile(profile.userId);
    }
  }

  // Override to use snake_case fields
  protected prepareCreate(data: any): any {
    return {
      ...data,
      created_at: data.created_at || Date.now(),
      updated_at: data.updated_at || Date.now(),
    };
  }

  protected prepareUpdate(data: any): any {
    return {
      ...data,
      updated_at: Date.now(),
    };
  }
}

export const createProfileRepository = (database: Database) => {
  return new ProfileRepository(database);
};