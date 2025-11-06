import * as Contacts from 'expo-contacts';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

export interface Friend {
  userId: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phoneNumber: string;
}

class FriendsService {
  private cachedFriends: Friend[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Request permission to access contacts
   */
  async requestContactsPermission(): Promise<boolean> {
    try {
      const { status: currentStatus } = await Contacts.getPermissionsAsync();

      if (currentStatus === 'granted') {
        return true;
      }

      if (currentStatus === 'undetermined') {
        const { status } = await Contacts.requestPermissionsAsync();
        return status === 'granted';
      }

      return false;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  }

  /**
   * Get phone numbers from device contacts
   */
  private async getContactPhoneNumbers(): Promise<string[]> {
    try {
      const hasPermission = await this.requestContactsPermission();
      if (!hasPermission) {
        return [];
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      if (!data || data.length === 0) {
        return [];
      }

      // Extract all phone numbers from contacts
      const phoneNumbers: string[] = [];
      data.forEach((contact) => {
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          contact.phoneNumbers.forEach((phone) => {
            const number = phone.number || phone.digits;
            if (number) {
              phoneNumbers.push(number);
            }
          });
        }
      });

      return phoneNumbers;
    } catch (error) {
      console.error('Error fetching contact phone numbers:', error);
      return [];
    }
  }

  /**
   * Match contacts against Podcast Club users
   */
  async matchContactsWithUsers(): Promise<Friend[]> {
    try {
      // Check cache first
      if (
        this.cachedFriends &&
        this.cacheTimestamp &&
        Date.now() - this.cacheTimestamp < this.CACHE_DURATION
      ) {
        console.log('Returning cached friends');
        return this.cachedFriends;
      }

      console.log('Fetching fresh friend matches...');

      // Get phone numbers from contacts
      const phoneNumbers = await this.getContactPhoneNumbers();

      if (phoneNumbers.length === 0) {
        console.log('No phone numbers found in contacts');
        return [];
      }

      console.log(`Found ${phoneNumbers.length} phone numbers in contacts`);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session');
        return [];
      }

      console.log('Session exists:', !!session);
      console.log('Access token exists:', !!session.access_token);
      console.log('Access token length:', session.access_token?.length);

      // Call the edge function to match contacts
      const { data, error } = await supabase.functions.invoke('match-contacts', {
        body: { phoneNumbers },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error matching contacts:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));

        // Try to read the response body for more details
        try {
          if ((error as any).context?._bodyBlob) {
            const blob = (error as any).context._bodyBlob;
            const reader = new FileReader();
            reader.onload = () => {
              console.error('Response body:', reader.result);
            };
            reader.readAsText(blob);
          }
        } catch (e) {
          console.error('Could not read response body:', e);
        }

        Alert.alert('Error', `Failed to match contacts: ${error.message || 'Unknown error'}`);
        return [];
      }

      if (!data) {
        console.log('No data returned from match-contacts');
        return [];
      }

      const friends: Friend[] = data.friends || [];
      console.log(`Found ${friends.length} friends on Podcast Club`);

      // Update cache
      this.cachedFriends = friends;
      this.cacheTimestamp = Date.now();

      return friends;
    } catch (error) {
      console.error('Error in matchContactsWithUsers:', error);
      return [];
    }
  }

  /**
   * Check if a user ID is a friend
   */
  async isFriend(userId: string): Promise<boolean> {
    const friends = await this.getFriends();
    return friends.some(f => f.userId === userId);
  }

  /**
   * Get cached friends or fetch if needed
   */
  async getFriends(): Promise<Friend[]> {
    if (
      this.cachedFriends &&
      this.cacheTimestamp &&
      Date.now() - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return this.cachedFriends;
    }

    return this.matchContactsWithUsers();
  }

  /**
   * Get friend IDs for quick lookup
   */
  async getFriendIds(): Promise<Set<string>> {
    const friends = await this.getFriends();
    return new Set(friends.map(f => f.userId));
  }

  /**
   * Refresh friend cache
   */
  async refreshFriends(): Promise<Friend[]> {
    this.cachedFriends = null;
    this.cacheTimestamp = null;
    return this.matchContactsWithUsers();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedFriends = null;
    this.cacheTimestamp = null;
  }
}

export const friendsService = new FriendsService();
