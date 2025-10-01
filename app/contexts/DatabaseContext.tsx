import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { Database } from '@nozbe/watermelondb';
import database from '../db';
import { WeeklySelectionRepository } from '../data/repositories/weekly-selection.repository';
import { ProgressRepository } from '../data/repositories/progress.repository';
import { ProfileRepository } from '../data/repositories/profile.repository';
import { CommentRepository } from '../data/repositories/comment.repository';
import { EpisodeDetailsRepository } from '../data/repositories/episode-details.repository';
import { BaseRepository } from '../data/repositories/base.repository';

interface DatabaseContextType {
  database: Database;
  weeklySelectionRepository: WeeklySelectionRepository;
  progressRepository: ProgressRepository;
  profileRepository: ProfileRepository;
  commentRepository: CommentRepository;
  episodeDetailsRepository: EpisodeDetailsRepository;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  // Use ref to ensure repositories are only created once
  const repositoriesRef = useRef<DatabaseContextType | null>(null);

  if (!repositoriesRef.current) {
    repositoriesRef.current = {
      database,
      weeklySelectionRepository: new WeeklySelectionRepository(database),
      progressRepository: new ProgressRepository(database),
      profileRepository: new ProfileRepository(database),
      commentRepository: new CommentRepository(database),
      episodeDetailsRepository: new EpisodeDetailsRepository(database),
    };
  }

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