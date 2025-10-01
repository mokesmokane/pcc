import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';
import { BaseRepository } from './base.repository';
import TranscriptSegment from '../models/transcript-segment.model';
import { supabase } from '../../lib/supabase';

export class TranscriptSegmentRepository extends BaseRepository<TranscriptSegment> {
  constructor(database: Database) {
    super(database, 'transcript_segments');
  }

  async upsertFromRemote(remoteData: any): Promise<TranscriptSegment> {
    const existing = await this.findById(remoteData.id);

    const flatData = {
      episode_id: remoteData.episode_id,
      start_seconds: remoteData.start_seconds,
      end_seconds: remoteData.end_seconds,
      text: remoteData.text,
      segment_index: remoteData.segment_index || 0,
      synced_at: Date.now(),
      needs_sync: false,
    };

    if (existing) {
      return await this.update(remoteData.id, flatData as any);
    } else {
      return await this.create({
        id: remoteData.id,
        ...flatData,
        created_at: remoteData.created_at ? new Date(remoteData.created_at).getTime() : Date.now(),
        updated_at: remoteData.updated_at ? new Date(remoteData.updated_at).getTime() : Date.now(),
      } as any);
    }
  }

  async markForSync(id: string): Promise<void> {
    await this.update(id, { needsSync: true } as any);
  }

  async getEpisodeSegments(episodeId: string): Promise<TranscriptSegment[]> {
    return await this.query([
      Q.where('episode_id', episodeId),
      Q.sortBy('segment_index', Q.asc),
      Q.sortBy('start_seconds', Q.asc),
    ]);
  }

  observeEpisodeSegments(episodeId: string): Observable<TranscriptSegment[]> {
    return this.observeQuery([
      Q.where('episode_id', episodeId),
      Q.sortBy('segment_index', Q.asc),
      Q.sortBy('start_seconds', Q.asc),
    ]);
  }

  async getCurrentSegment(episodeId: string, position: number): Promise<TranscriptSegment | null> {
    const segments = await this.query([
      Q.where('episode_id', episodeId),
      Q.where('start_seconds', Q.lte(position)),
      Q.where('end_seconds', Q.gt(position)),
    ]);

    return segments.length > 0 ? segments[0] : null;
  }

  observeCurrentSegment(episodeId: string, position: number): Observable<TranscriptSegment | null> {
    return new Observable(observer => {
      const subscription = this.observeQuery([
        Q.where('episode_id', episodeId),
        Q.where('start_seconds', Q.lte(position)),
        Q.where('end_seconds', Q.gt(position)),
      ]).subscribe(segments => {
        observer.next(segments.length > 0 ? segments[0] : null);
      });

      return () => subscription.unsubscribe();
    });
  }

  async syncWithRemote(episodeId: string): Promise<void> {
    try {
      // Fetch segments from Supabase
      const { data: segments, error } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('episode_id', episodeId)
        .order('start_seconds', { ascending: true });

      if (error) throw error;

      if (segments && segments.length > 0) {
        // Batch upsert all segments
        await this.database.write(async () => {
          for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            // Convert id to string if it's a number
            const segmentId = String(segment.id);

            // Check if segment with this specific ID exists
            let existing;
            try {
              existing = await this.collection.find(segmentId);
            } catch {
              existing = null;
            }

            if (existing) {
              // Update existing segment
              await existing.update((record: any) => {
                record.episodeId = segment.episode_id;
                record.startSeconds = Number(segment.start_seconds);
                record.endSeconds = Number(segment.end_seconds);
                record.text = String(segment.text);
                record.segmentIndex = i;
                record.syncedAt = Date.now();
                record.needsSync = false;
              });
            } else {
              // Create new segment
              await this.collection.create((record: any) => {
                record._raw.id = segmentId;
                record._raw.episode_id = String(segment.episode_id);
                record._raw.start_seconds = Number(segment.start_seconds);
                record._raw.end_seconds = Number(segment.end_seconds);
                record._raw.text = String(segment.text);
                record._raw.segment_index = i;
                record._raw.created_at = segment.created_at ? new Date(segment.created_at).getTime() : Date.now();
                record._raw.updated_at = Date.now();
                record._raw.synced_at = Date.now();
                record._raw.needs_sync = false;
              });
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to sync transcript segments:', error);
      throw error;
    }
  }

  async deleteEpisodeSegments(episodeId: string): Promise<void> {
    const segments = await this.getEpisodeSegments(episodeId);
    await this.batchDelete(segments.map(s => s.id));
  }

  // Helper to find segment at position
  findSegmentAtPosition(segments: TranscriptSegment[], position: number): TranscriptSegment | null {
    return segments.find(
      seg => position >= seg.startSeconds && position < seg.endSeconds
    ) || null;
  }

  // Helper to get surrounding segments
  getSurroundingSegments(
    segments: TranscriptSegment[],
    currentIndex: number,
    windowSize: number = 5
  ): TranscriptSegment[] {
    const startIdx = Math.max(0, currentIndex - Math.floor(windowSize / 2));
    const endIdx = Math.min(segments.length, startIdx + windowSize);
    return segments.slice(startIdx, endIdx);
  }

  // Override to use snake_case fields
  protected prepareCreate(data: any): any {
    return {
      ...data,
      created_at: data.created_at || Date.now(),
      updated_at: data.updated_at || Date.now(),
      needs_sync: data.needs_sync !== undefined ? data.needs_sync : true,
    };
  }

  protected prepareUpdate(data: any): any {
    return {
      ...data,
      updated_at: Date.now(),
    };
  }
}

export const createTranscriptSegmentRepository = (database: Database) => {
  return new TranscriptSegmentRepository(database);
};