import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { BaseRepository } from './base.repository';
import Member from '../models/member.model';
import { supabase } from '../../lib/supabase';

export class MembersRepository extends BaseRepository<Member> {
  constructor(database: Database) {
    super(database, 'members');
  }

  async getEpisodeMembers(episodeId: string): Promise<Member[]> {
    // First sync from remote
    await this.syncEpisodeMembers(episodeId);

    // Then get from local database
    const members = await this.query([
      Q.where('episode_id', episodeId),
      Q.sortBy('progress', Q.desc),
      Q.sortBy('comment_count', Q.desc)
    ]);

    return members;
  }

  async syncEpisodeMembers(episodeId: string): Promise<void> {
    try {
      // Fetch members from Supabase view
      const { data, error } = await supabase
        .from('episode_members_view')
        .select('*')
        .eq('episode_id', episodeId);

      if (error) {
        console.error('Failed to fetch episode members:', error);
        return;
      }

      if (!data || data.length === 0) {
        return;
      }

      // Upsert each member to local database
      for (const memberData of data) {
        await this.upsertMember(memberData);
      }
    } catch (error) {
      console.error('Error syncing episode members:', error);
    }
  }

  private async upsertMember(remoteData: any): Promise<Member> {
    // Create unique ID combining user_id and episode_id
    const memberId = `${remoteData.user_id}_${remoteData.episode_id}`;

    const existing = await this.findById(memberId);

    const memberData = {
      user_id: remoteData.user_id,
      episode_id: remoteData.episode_id,
      first_name: remoteData.first_name,
      last_name: remoteData.last_name,
      username: remoteData.username,
      avatar_url: remoteData.avatar_url,
      progress: remoteData.progress || 0,
      has_finished: remoteData.has_finished || false,
      comment_count: remoteData.comment_count || 0,
      last_activity: remoteData.last_activity ? new Date(remoteData.last_activity).getTime() : Date.now(),
      synced_at: Date.now(),
      needs_sync: false,
    };

    if (existing) {
      return await this.update(existing.id, memberData as any);
    } else {
      return await this.create({
        id: memberId,
        ...memberData,
      } as any);
    }
  }

  async getMemberStats(episodeId: string): Promise<{
    totalMembers: number;
    finishedCount: number;
    averageProgress: number;
    totalComments: number;
  }> {
    const members = await this.getEpisodeMembers(episodeId);

    if (members.length === 0) {
      return {
        totalMembers: 0,
        finishedCount: 0,
        averageProgress: 0,
        totalComments: 0,
      };
    }

    const finishedCount = members.filter(m => m.hasFinished).length;
    const totalProgress = members.reduce((sum, m) => sum + m.progress, 0);
    const totalComments = members.reduce((sum, m) => sum + m.commentCount, 0);

    return {
      totalMembers: members.length,
      finishedCount,
      averageProgress: Math.round(totalProgress / members.length),
      totalComments,
    };
  }

  async getCurrentUserProgress(episodeId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const memberId = `${user.id}_${episodeId}`;
    const member = await this.findById(memberId);

    return member?.progress || 0;
  }

  // Override to use snake_case fields
  protected prepareCreate(data: any): any {
    return {
      ...data,
      created_at: data.created_at || Date.now(),
      updated_at: data.updated_at || Date.now(),
    };
  }

  protected prepareUpdate(data: any): any {
    return {
      ...data,
      updated_at: Date.now(),
    };
  }
}

export const createMembersRepository = (database: Database) => {
  return new MembersRepository(database);
};