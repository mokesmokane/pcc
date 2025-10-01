import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ProfileRepository } from '../data/repositories/profile.repository';
import Profile from '../data/models/profile.model';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (
    username: string | null,
    avatarUri?: string,
    firstName?: string | null,
    lastName?: string | null
  ) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  getInitials: () => string;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { profileRepository } = useDatabase();

  // Load profile when user changes
  useEffect(() => {
    if (user && profileRepository) {
      loadProfile();
    } else if (!user) {
      setProfile(null);
      setLoading(false);
    }
  }, [user, profileRepository]);

  const loadProfile = async () => {
    if (!profileRepository || !user) return;

    setLoading(true);
    setError(null);

    try {
      const userProfile = await profileRepository.getCurrentUserProfile();
      setProfile(userProfile);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (
    username: string | null,
    avatarUri?: string,
    firstName?: string | null,
    lastName?: string | null
  ): Promise<boolean> => {
    if (!profileRepository || !user) {
      setError('Not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // If avatarUri is provided, handle the upload
      let avatarUrl = avatarUri;

      const updatedProfile = await profileRepository.updateProfile(
        user.id,
        username,
        avatarUrl || profile?.avatarUrl || null,
        firstName,
        lastName
      );

      if (updatedProfile) {
        setProfile(updatedProfile);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  const getInitials = (): string => {
    // Use firstName and lastName if available
    if (profile?.firstName || profile?.lastName) {
      const firstInitial = profile.firstName ? profile.firstName[0].toUpperCase() : '';
      const lastInitial = profile.lastName ? profile.lastName[0].toUpperCase() : '';
      return (firstInitial + lastInitial) || 'U';
    }

    // Fallback to username
    if (!profile?.username) return 'U';

    return profile.username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const value: ProfileContextType = {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
    getInitials,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}