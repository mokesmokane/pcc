import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';

const ERROR_OUTBOX_KEY = '@error_outbox';
const MAX_OUTBOX_SIZE = 100;

export interface ErrorRecord {
  id: string;
  userId?: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, any>;
  deviceInfo: {
    platform: string;
    osVersion: string;
    appVersion: string;
  };
  timestamp: string;
  retryCount: number;
}

class ErrorOutbox {
  private static instance: ErrorOutbox | null = null;
  private outbox: ErrorRecord[] = [];
  private isLoaded: boolean = false;

  private constructor() {
    this.loadOutbox();
  }

  static getInstance(): ErrorOutbox {
    if (!ErrorOutbox.instance) {
      ErrorOutbox.instance = new ErrorOutbox();
    }
    return ErrorOutbox.instance;
  }

  private async loadOutbox() {
    try {
      const data = await AsyncStorage.getItem(ERROR_OUTBOX_KEY);
      if (data) {
        this.outbox = JSON.parse(data);
      }
      this.isLoaded = true;
    } catch (error) {
      console.error('Error loading error outbox:', error);
      this.outbox = [];
      this.isLoaded = true;
    }
  }

  private async saveOutbox() {
    try {
      await AsyncStorage.setItem(ERROR_OUTBOX_KEY, JSON.stringify(this.outbox));
    } catch (error) {
      console.error('Error saving error outbox:', error);
    }
  }

  async addError(error: Omit<ErrorRecord, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    // Wait for initial load
    while (!this.isLoaded) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const errorRecord: ErrorRecord = {
      ...error,
      id: nanoid(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    this.outbox.push(errorRecord);

    // Keep outbox size under control
    if (this.outbox.length > MAX_OUTBOX_SIZE) {
      this.outbox = this.outbox.slice(-MAX_OUTBOX_SIZE);
    }

    await this.saveOutbox();
    return errorRecord.id;
  }

  async getOutbox(): Promise<ErrorRecord[]> {
    while (!this.isLoaded) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return [...this.outbox];
  }

  async removeError(id: string) {
    this.outbox = this.outbox.filter(e => e.id !== id);
    await this.saveOutbox();
  }

  async incrementRetryCount(id: string) {
    const error = this.outbox.find(e => e.id === id);
    if (error) {
      error.retryCount++;
      await this.saveOutbox();
    }
  }

  async clearOutbox() {
    this.outbox = [];
    await this.saveOutbox();
  }

  async getOutboxSize(): Promise<number> {
    while (!this.isLoaded) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.outbox.length;
  }
}

export const errorOutbox = ErrorOutbox.getInstance();
