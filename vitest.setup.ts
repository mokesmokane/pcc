// Vitest setup file
import { vi } from 'vitest';

// Mock React Native modules that aren't available in Node
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: vi.fn((obj) => obj.ios),
  },
  Dimensions: {
    get: vi.fn(() => ({ width: 375, height: 812 })),
  },
}));

// Set up any global test utilities or configurations
globalThis.__DEV__ = true;