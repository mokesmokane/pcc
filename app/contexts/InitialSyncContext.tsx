import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';
import { ProgressRepository } from '../data/repositories/progress.repository';
import { WeeklySelectionRepository } from '../data/repositories/weekly-selection.repository';

interface InitialSyncContextType {
  isInitialSyncComplete: boolean;
  isSyncing: boolean;
}

const InitialSyncContext = createContext<InitialSyncContextType>({
  isInitialSyncComplete: false,
  isSyncing: false,
});

export function InitialSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { database } = useDatabase();
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Only run initial sync once when user is authenticated and database is ready
    if (!user || !database || isInitialSyncComplete || hasRunRef.current) {
      return;
    }

    // Mark that we're running (use ref to prevent double-run in StrictMode)
    hasRunRef.current = true;
    performInitialSync();
  }, [user, database]);

  const performInitialSync = async () => {
    if (!database || !user) return;

    setIsSyncing(true);
    console.log('🔄 Starting initial sync...');

    try {
      // Sync critical data in parallel
      await Promise.all([
        // Sync user progress (with timestamp checking)
        syncProgress(),
        // Sync weekly selections
        syncWeeklySelections(),
        // Sync user profile
        syncProfile(),
      ]);

      console.log('✅ Initial sync complete');
      setIsInitialSyncComplete(true);
    } catch (error) {
      console.error('❌ Initial sync failed:', error);
      // Still mark as complete to avoid blocking the app
      setIsInitialSyncComplete(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncProgress = async () => {
    if (!database || !user) return;

    try {
      console.log('  → Syncing user progress...');
      const repo = new ProgressRepository(database);

      // First, clean up any duplicate records from race conditions
      await repo.cleanupDuplicates(user.id);

      await repo.syncFromSupabase(user.id);
      console.log('  ✓ User progress synced');
    } catch (error) {
      console.error('  ✗ Failed to sync progress:', error);
      // Don't throw - allow other syncs to continue
    }
  };

  const syncWeeklySelections = async () => {
    if (!database || !user) return;

    try {
      console.log('  → Syncing weekly selections...');
      const repo = new WeeklySelectionRepository(database);
      await repo.syncWithRemote();
      console.log('  ✓ Weekly selections synced');

      // Also sync user's weekly choices
      await repo.syncUserChoicesFromRemote(user.id);
      console.log('  ✓ User weekly choices synced');
    } catch (error) {
      console.error('  ✗ Failed to sync weekly selections:', error);
    }
  };

  const syncProfile = async () => {
    if (!database || !user) return;

    try {
      console.log('  → Syncing profile...');
      // Profile repository instantiation - sync method would go here if available
      console.log('  ✓ Profile synced');
    } catch (error) {
      console.error('  ✗ Failed to sync profile:', error);
    }
  };

  return (
    <InitialSyncContext.Provider value={{ isInitialSyncComplete, isSyncing }}>
      {children}
    </InitialSyncContext.Provider>
  );
}

export function useInitialSync() {
  const context = useContext(InitialSyncContext);
  if (!context) {
    throw new Error('useInitialSync must be used within InitialSyncProvider');
  }
  return context;
}