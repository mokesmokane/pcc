import { supabase } from '../../lib/supabase';
import type { ErrorRecord } from './errorOutbox';
import { errorOutbox } from './errorOutbox';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';

const MAX_RETRY_ATTEMPTS = 3;
const SYNC_INTERVAL = 60000; // 1 minute

interface ErrorContext {
  component?: string;
  action?: string;
  trackId?: string;
  trackTitle?: string;
  position?: number;
  duration?: number;
  [key: string]: any;
}

class ErrorTrackingService {
  private static instance: ErrorTrackingService | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;

  private constructor() {}

  static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  async initialize() {
    // Start background sync
    this.startBackgroundSync();

    // Try initial sync
    this.syncErrors();
  }

  private startBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.syncErrors();
    }, SYNC_INTERVAL);
  }

  stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private getDeviceInfo() {
    return {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      appVersion: Constants.expoConfig?.version || 'unknown',
    };
  }

  async trackError(
    error: Error | string,
    context?: ErrorContext
  ): Promise<void> {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const stackTrace = typeof error === 'string' ? undefined : error.stack;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Add to outbox
      await errorOutbox.addError({
        userId: user?.id,
        errorType: typeof error === 'string' ? 'manual' : error.name || 'Error',
        errorMessage,
        stackTrace,
        context,
        deviceInfo: this.getDeviceInfo(),
      });

      console.log('Error tracked to outbox:', errorMessage);

      // Try to sync immediately if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        this.syncErrors();
      }
    } catch (err) {
      console.error('Failed to track error:', err);
    }
  }

  async syncErrors(): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    try {
      this.isSyncing = true;

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('No network connection, skipping error sync');
        return;
      }

      const errors = await errorOutbox.getOutbox();
      if (errors.length === 0) {
        return;
      }

      console.log(`Syncing ${errors.length} errors to Supabase...`);

      const errorsToSync = errors.filter(
        e => e.retryCount < MAX_RETRY_ATTEMPTS
      );

      for (const error of errorsToSync) {
        try {
          await this.uploadError(error);
          await errorOutbox.removeError(error.id);
          console.log(`Successfully synced error ${error.id}`);
        } catch (uploadError) {
          console.error(`Failed to upload error ${error.id}:`, uploadError);
          await errorOutbox.incrementRetryCount(error.id);
        }
      }

      // Clean up errors that have exceeded retry attempts
      const failedErrors = errors.filter(
        e => e.retryCount >= MAX_RETRY_ATTEMPTS
      );
      for (const error of failedErrors) {
        console.warn(`Removing error ${error.id} after ${MAX_RETRY_ATTEMPTS} failed attempts`);
        await errorOutbox.removeError(error.id);
      }

      const remainingCount = await errorOutbox.getOutboxSize();
      if (remainingCount > 0) {
        console.log(`${remainingCount} errors remaining in outbox`);
      }
    } catch (err) {
      console.error('Error during sync:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  private async uploadError(error: ErrorRecord): Promise<void> {
    const { error: uploadError } = await supabase
      .from('errors')
      .insert({
        user_id: error.userId || null,
        error_type: error.errorType,
        error_message: error.errorMessage,
        stack_trace: error.stackTrace || null,
        context: error.context || {},
        device_info: error.deviceInfo,
        created_at: error.timestamp,
      });

    if (uploadError) {
      throw uploadError;
    }
  }

  async getOutboxSize(): Promise<number> {
    return errorOutbox.getOutboxSize();
  }

  async clearOutbox(): Promise<void> {
    await errorOutbox.clearOutbox();
  }
}

export const errorTrackingService = ErrorTrackingService.getInstance();

// Convenience functions
export const trackError = (error: Error | string, context?: ErrorContext) => {
  return errorTrackingService.trackError(error, context);
};

export const trackAudioError = (
  error: Error | string,
  trackId?: string,
  trackTitle?: string,
  additionalContext?: Record<string, any>
) => {
  return errorTrackingService.trackError(error, {
    component: 'AudioPlayer',
    trackId,
    trackTitle,
    ...additionalContext,
  });
};
