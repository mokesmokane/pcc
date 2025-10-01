import { Platform } from 'react-native';

interface Config {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;

  // API
  apiBaseUrl: string;
  wsUrl: string;

  // Features
  features: {
    social: boolean;
    downloads: boolean;
    offlineMode: boolean;
    realtimeSync: boolean;
  };

  // Sync
  sync: {
    interval: number; // milliseconds
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
  };

  // Playback
  playback: {
    progressUpdateInterval: number; // milliseconds
    jumpForwardSeconds: number;
    jumpBackwardSeconds: number;
  };

  // Downloads
  downloads: {
    maxConcurrent: number;
    chunkSize: number;
    resumable: boolean;
    wifiOnly: boolean;
  };

  // Cache
  cache: {
    maxSize: number; // bytes
    ttl: {
      podcasts: number; // seconds
      episodes: number;
      images: number;
      userContent: number;
    };
  };

  // Development
  isDev: boolean;
  mockApi: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// In Expo, we need to hardcode the values or use a different approach
// Since process.env doesn't work at runtime in React Native
export const config: Config = {
  // Supabase - These need to be hardcoded or loaded differently
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mfycdfhwqlvqdqjvxdhv.supabase.co',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meWNkZmh3cWx2cWRxanZ4ZGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjQyNTUsImV4cCI6MjA3NDIwMDI1NX0.oHBYPFZrfBMyJRPc6nl1RiFgX4VeGDQ5VJHG39yuwO0',

  // API
  apiBaseUrl: 'https://localhost:3000',
  wsUrl: 'wss://localhost:3000',

  // Features
  features: {
    social: true,
    downloads: true,
    offlineMode: true,
    realtimeSync: true,
  },

  // Sync configuration
  sync: {
    interval: 30000, // 30 seconds
    batchSize: 50,
    maxRetries: 3,
    retryDelay: 1000,
  },

  // Playback configuration
  playback: {
    progressUpdateInterval: 5000,
    jumpForwardSeconds: 30,
    jumpBackwardSeconds: 10,
  },

  // Downloads configuration
  downloads: {
    maxConcurrent: 3,
    chunkSize: 1024 * 1024, // 1MB
    resumable: true,
    wifiOnly: false,
  },

  // Cache configuration
  cache: {
    maxSize: 500 * 1024 * 1024, // 500MB
    ttl: {
      podcasts: 3600, // 1 hour
      episodes: 1800, // 30 minutes
      images: 86400, // 1 day
      userContent: 300, // 5 minutes
    },
  },

  // Development
  isDev: __DEV__,
  mockApi: false,
  logLevel: 'info' as Config['logLevel'],
};

// Feature flags helper
export const isFeatureEnabled = (feature: keyof Config['features']): boolean => {
  return config.features[feature];
};

// Platform-specific config
export const platformConfig = {
  downloadDir: Platform.select({
    ios: '/Documents/downloads',
    android: '/PodcastClub/downloads',
    default: '/downloads',
  }),
};

// Validate config
export const validateConfig = (): boolean => {
  const required = ['supabaseUrl', 'supabaseAnonKey'];
  const missing = required.filter((key) => !config[key as keyof Config]);

  if (missing.length > 0) {
    console.error(`Missing required config: ${missing.join(', ')}`);
    return false;
  }

  return true;
};

export default config;