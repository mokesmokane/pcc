import type { Database} from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type EpisodeDetails from '../models/episode-details.model';
import { BaseRepository } from './base.repository';
import { supabase } from '../../lib/supabase';

export class EpisodeDetailsRepository extends BaseRepository<EpisodeDetails> {
  constructor(database: Database) {
    super(database, 'episode_details');
  }

  async getEpisodeDetails(episodeId: string): Promise<EpisodeDetails | null> {
    try {
      const details = await this.database
        .get<EpisodeDetails>('episode_details')
        .query(Q.where('episode_id', episodeId))
        .fetch();

      return details[0] || null;
    } catch (error) {
      console.error('Error getting episode details:', error);
      return null;
    }
  }

  async saveEpisodeDetails(
    episodeId: string,
    about: string,
    whyWeLoveIt: string
  ): Promise<boolean> {
    const database = this.database;
    const getEpisodeDetails = this.getEpisodeDetails.bind(this);

    try {
      await this.database.write(async function upsertEpisodeDetailsLocally() {
        const existing = await getEpisodeDetails(episodeId);

        if (existing) {
          await existing.update((details) => {
            details.about = about;
            details.whyWeLoveIt = whyWeLoveIt;
            details.needsSync = true;
          });
        } else {
          await database.get<EpisodeDetails>('episode_details').create((details) => {
            details.episodeId = episodeId;
            details.about = about;
            details.whyWeLoveIt = whyWeLoveIt;
            details.needsSync = true;
          });
        }
      });

      return true;
    } catch (error) {
      console.error('Error saving episode details:', error);
      return false;
    }
  }

  async syncWithRemote(): Promise<void> {
    try {
      // Fetch all episode details from Supabase
      const { data: remoteDetails, error } = await supabase
        .from('episode_details')
        .select('*');

      if (error) {
        console.error('Error fetching remote episode details:', error);
        return;
      }

      if (!remoteDetails) return;

      const database = this.database;
      const getEpisodeDetails = this.getEpisodeDetails.bind(this);

      await this.database.write(async function syncAllEpisodeDetailsFromRemote() {
        for (const remote of remoteDetails) {
          const existing = await getEpisodeDetails(remote.episode_id);

          if (!existing) {
            await database.get<EpisodeDetails>('episode_details').create((details) => {
              details.episodeId = remote.episode_id;
              details.about = remote.about || '';
              details.whyWeLoveIt = remote.why_we_love_it || '';
              details.syncedAt = Date.now();
              details.needsSync = false;
            });
          } else if (existing.syncedAt && existing.syncedAt < new Date(remote.updated_at).getTime()) {
            await existing.update((details) => {
              details.about = remote.about || '';
              details.whyWeLoveIt = remote.why_we_love_it || '';
              details.syncedAt = Date.now();
              details.needsSync = false;
            });
          }
        }
      });
    } catch (error) {
      console.error('Error syncing episode details:', error);
    }
  }
}