import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import { Share, Platform, Alert, Linking } from 'react-native';

export interface Contact {
  id: string;
  name: string;
  phoneNumbers?: string[];
  selected?: boolean;
}

class InviteService {
  /**
   * Request permission to access contacts
   */
  async requestContactsPermission(): Promise<boolean> {
    try {
      // First check current permission status
      const { status: currentStatus } = await Contacts.getPermissionsAsync();

      // If already granted, return true
      if (currentStatus === 'granted') {
        return true;
      }

      // If undetermined, request permission (will show native prompt)
      if (currentStatus === 'undetermined') {
        const { status } = await Contacts.requestPermissionsAsync();
        return status === 'granted';
      }

      // If denied, show alert to go to settings
      return new Promise((resolve) => {
        Alert.alert(
          'Contacts Permission Required',
          'To invite friends from your contacts, please enable contacts access in Settings.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Open Settings',
              onPress: async () => {
                await Linking.openSettings();
                resolve(false);
              },
            },
          ]
        );
      });
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  }

  /**
   * Fetch all contacts from the device
   */
  async getContacts(): Promise<Contact[]> {
    try {
      const hasPermission = await this.requestContactsPermission();
      if (!hasPermission) {
        return [];
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (!data || data.length === 0) {
        return [];
      }

      return data
        .filter((contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map((contact) => ({
          id: contact.id,
          name: contact.name || 'Unknown',
          phoneNumbers: contact.phoneNumbers?.map((phone) => phone.number || phone.digits || ''),
          selected: false,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
      return [];
    }
  }

  /**
   * Send SMS invites to selected contacts
   */
  async sendSMSInvites(phoneNumbers: string[], message: string): Promise<boolean> {
    try {
      const isAvailable = await SMS.isAvailableAsync();

      if (!isAvailable) {
        // Fallback to share if SMS is not available
        return this.shareInvite(message);
      }

      const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
      return result === 'sent';
    } catch (error) {
      console.error('Error sending SMS invites:', error);
      Alert.alert('Error', 'Failed to send invites. Please try again.');
      return false;
    }
  }

  /**
   * Share invite link using native share sheet
   */
  async shareInvite(message: string): Promise<boolean> {
    try {
      const result = await Share.share({
        message,
        ...(Platform.OS === 'ios' && {
          url: 'https://podcastclub.app', // Replace with your actual app URL
        }),
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Error sharing invite:', error);
      Alert.alert('Error', 'Failed to share invite. Please try again.');
      return false;
    }
  }

  /**
   * Generate invite message
   */
  generateInviteMessage(userName?: string): string {
    const appName = 'Podcast Club';
    const appUrl = 'https://podcastclub.app'; // Replace with your actual app URL/store link

    if (userName) {
      return `Hey! ${userName} invited you to join ${appName} - a community where we listen to and discuss podcasts together. Join us: ${appUrl}`;
    }

    return `Join me on ${appName} - a community where we listen to and discuss podcasts together! ${appUrl}`;
  }
}

export const inviteService = new InviteService();
