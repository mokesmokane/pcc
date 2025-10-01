import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

interface MediaMetadata {
  title: string;
  artist: string;
  artwork?: string;
}

class MediaNotificationService {
  private static instance: MediaNotificationService | null = null;
  private notificationId: string | null = null;
  private channelId: string = 'media-playback';

  private constructor() {}

  static getInstance(): MediaNotificationService {
    if (!MediaNotificationService.instance) {
      MediaNotificationService.instance = new MediaNotificationService();
    }
    return MediaNotificationService.instance;
  }

  async initialize() {
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
    }

    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(this.channelId, {
        name: 'Media Playback',
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        enableVibrate: false,
        showBadge: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    // Set up notification categories with actions
    await this.setupNotificationActions();
  }

  private async setupNotificationActions() {
    // Define actions for media controls
    await Notifications.setNotificationCategoryAsync('media-controls', [
      {
        identifier: 'skip-backward',
        buttonTitle: 'Skip -15s',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'play-pause',
        buttonTitle: 'Play/Pause',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'skip-forward',
        buttonTitle: 'Skip +30s',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  }

  async showMediaNotification(metadata: MediaMetadata, isPlaying: boolean) {
    try {
      console.log('📱 Showing media notification:', metadata.title, 'Playing:', isPlaying, 'Artwork:', metadata.artwork);

      const notification: Notifications.NotificationContentInput = {
        title: metadata.title,
        body: metadata.artist,
        categoryIdentifier: 'media-controls',
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sound: null,
        autoDismiss: false,
        data: {
          type: 'media-control',
          isPlaying,
        },
      };

      if (Platform.OS === 'android') {
        notification.color = '#E05F4E';
        (notification as any).channelId = this.channelId;

        // Try different Android notification image properties
        if (metadata.artwork) {
          const androidExtras: any = {
            largeIconUrl: metadata.artwork,
            bigPictureUrl: metadata.artwork,
          };
          (notification as any).androidExtras = androidExtras;
        }
      } else {
        // iOS uses attachments
        if (metadata.artwork) {
          (notification as any).attachments = [{
            identifier: 'artwork',
            url: metadata.artwork,
          }];
        }
      }

      // Only create notification if it doesn't exist yet
      if (!this.notificationId) {
        const notificationRequest = await Notifications.scheduleNotificationAsync({
          content: notification,
          trigger: null, // Show immediately
        });
        this.notificationId = notificationRequest;
        console.log('📱 Notification created with ID:', notificationRequest);
      }
      // Otherwise just leave it alone - the notification stays persistent
    } catch (error) {
      console.error('❌ Error showing media notification:', error);
    }
  }

  async updatePlaybackState(isPlaying: boolean) {
    // For now, just update the notification with new state
    // In a more advanced implementation, we could change the button icons
  }

  async hideMediaNotification() {
    if (this.notificationId) {
      await Notifications.dismissNotificationAsync(this.notificationId);
      this.notificationId = null;
    }
  }

  // Set up listeners for notification actions
  setupActionListeners(callbacks: {
    onPlay: () => void;
    onPause: () => void;
    onSkipForward: () => void;
    onSkipBackward: () => void;
  }) {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;

      switch (action) {
        case 'play-pause':
          // We don't know the current state here, so the callback should handle toggling
          callbacks.onPlay();
          break;
        case 'skip-forward':
          callbacks.onSkipForward();
          break;
        case 'skip-backward':
          callbacks.onSkipBackward();
          break;
      }
    });
  }
}

export const mediaNotificationService = MediaNotificationService.getInstance();
