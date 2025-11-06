import type { ReactNode } from 'react';
import React, { createContext, useContext, useRef, useEffect } from 'react';
import type { Database } from '@nozbe/watermelondb';
import database from '../db';
import { WeeklySelectionRepository } from '../data/repositories/weekly-selection.repository';
import { ProgressRepository } from '../data/repositories/progress.repository';
import { ProfileRepository } from '../data/repositories/profile.repository';
import { CommentRepository } from '../data/repositories/comment.repository';
import { EpisodeDetailsRepository } from '../data/repositories/episode-details.repository';
import { BaseRepository } from '../data/repositories/base.repository';
import { RealtimeManager } from '../services/realtime/realtime.manager';

interface DatabaseContextType {
  database: Database;
  weeklySelectionRepository: WeeklySelectionRepository;
  progressRepository: ProgressRepository;
  profileRepository: ProfileRepository;
  commentRepository: CommentRepository;
  episodeDetailsRepository: EpisodeDetailsRepository;
  resetDatabase: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  // Use ref to ensure repositories are only created once
  const repositoriesRef = useRef<DatabaseContextType | null>(null);
  const realtimeManagerRef = useRef<RealtimeManager | null>(null);

  const resetDatabase = async () => {
    console.log('🗑️ Resetting database...');
    await database.write(async function resetEntireDatabase() {
      await database.unsafeResetDatabase();
    });
    console.log('✅ Database reset complete');
  };

  if (!repositoriesRef.current) {
    repositoriesRef.current = {
      database,
      weeklySelectionRepository: new WeeklySelectionRepository(database),
      progressRepository: new ProgressRepository(database),
      profileRepository: new ProfileRepository(database),
      commentRepository: new CommentRepository(database),
      episodeDetailsRepository: new EpisodeDetailsRepository(database),
      resetDatabase,
    };
  }

  // Initialize Realtime subscriptions
  useEffect(() => {
    const manager = new RealtimeManager(database);
    realtimeManagerRef.current = manager;

    manager.initialize().catch((error) => {
      console.error('Failed to initialize Realtime subscriptions:', error);
    });

    return () => {
      manager.cleanup().catch((error) => {
        console.error('Failed to cleanup Realtime subscriptions:', error);
      });
    };
  }, []);

  return (
    <DatabaseContext.Provider value={repositoriesRef.current}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};