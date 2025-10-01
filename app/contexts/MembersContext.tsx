import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { MembersRepository } from '../data/repositories/members.repository';
import Member from '../data/models/member.model';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';

interface MemberData {
  id: string;
  name: string;
  avatar?: string;
  progress: number;
  hasFinished: boolean;
  commentCount: number;
  lastActivity: string;
  isCurrentUser: boolean;
}

interface MemberStats {
  totalMembers: number;
  finishedCount: number;
  averageProgress: number;
  totalComments: number;
}

interface MembersContextType {
  members: MemberData[];
  stats: MemberStats;
  currentUserProgress: number;
  loading: boolean;
  error: string | null;
  loadMembers: (episodeId: string) => Promise<void>;
  refreshMembers: () => Promise<void>;
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [stats, setStats] = useState<MemberStats>({
    totalMembers: 0,
    finishedCount: 0,
    averageProgress: 0,
    totalComments: 0,
  });
  const [currentUserProgress, setCurrentUserProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);

  const { user } = useAuth();
  const { database } = useDatabase();
  const [membersRepository, setMembersRepository] = useState<MembersRepository | null>(null);

  // Initialize repository
  useEffect(() => {
    if (database) {
      setMembersRepository(new MembersRepository(database));
    }
  }, [database]);

  const loadMembers = async (episodeId: string) => {
    if (!membersRepository) {
      setError('Database not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentEpisodeId(episodeId);

    try {
      // Get members from repository (which syncs from Supabase)
      const dbMembers = await membersRepository.getEpisodeMembers(episodeId);

      // Format members for display
      const formattedMembers: MemberData[] = dbMembers.map(member => ({
        id: member.userId,
        name: member.displayName,
        avatar: member.avatarUrl,
        progress: member.progress,
        hasFinished: member.hasFinished,
        commentCount: member.commentCount,
        lastActivity: member.lastActivityRelative,
        isCurrentUser: member.userId === user?.id,
      }));

      // Sort: current user first, then by progress
      formattedMembers.sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return b.progress - a.progress;
      });

      setMembers(formattedMembers);

      // Get stats
      const memberStats = await membersRepository.getMemberStats(episodeId);
      setStats(memberStats);

      // Get current user progress
      const userProgress = await membersRepository.getCurrentUserProgress(episodeId);
      setCurrentUserProgress(userProgress);

    } catch (err) {
      console.error('Failed to load members:', err);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const refreshMembers = async () => {
    if (currentEpisodeId) {
      await loadMembers(currentEpisodeId);
    }
  };

  const value: MembersContextType = {
    members,
    stats,
    currentUserProgress,
    loading,
    error,
    loadMembers,
    refreshMembers,
  };

  return (
    <MembersContext.Provider value={value}>
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers() {
  const context = useContext(MembersContext);
  if (context === undefined) {
    throw new Error('useMembers must be used within a MembersProvider');
  }
  return context;
}