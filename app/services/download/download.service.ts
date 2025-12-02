import { create } from 'zustand';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DOWNLOADS_KEY = '@downloaded_episodes';

interface Download {
  id: string;
  episodeId: string;
  url: string;
  filePath: string;
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error';
  error?: string;
  downloadResumable?: FileSystem.DownloadResumable;
  // Metadata for saving to downloads list
  metadata?: {
    title: string;
    podcastTitle: string;
    artwork: string;
    description?: string;
  };
}

// Downloaded episode record (persisted to AsyncStorage)
export interface DownloadedEpisode {
  id: string;
  title: string;
  podcastTitle: string;
  artwork: string;
  localPath: string;
  downloadedAt: number;
  description?: string;
}

interface DownloadState {
  // Active downloads (in-progress)
  downloads: Map<string, Download>;
  activeDownloads: Set<string>;

  // Completed downloads list (persisted)
  downloadedEpisodes: DownloadedEpisode[];
  isLoadingDownloads: boolean;

  // Active download actions
  addDownload: (download: Download) => void;
  updateDownload: (id: string, updates: Partial<Download>) => void;
  removeDownload: (id: string) => void;
  getDownload: (id: string) => Download | undefined;
  getAllDownloads: () => Download[];

  // Downloaded episodes actions
  loadDownloadedEpisodes: () => Promise<void>;
  addDownloadedEpisode: (episode: DownloadedEpisode) => void;
  removeDownloadedEpisode: (episodeId: string) => void;
  isEpisodeDownloaded: (episodeId: string) => boolean;
}

// Selectors
export const selectDownloadedEpisodes = (state: DownloadState) => state.downloadedEpisodes;
export const selectIsLoadingDownloads = (state: DownloadState) => state.isLoadingDownloads;
export const selectDownloads = (state: DownloadState) => state.downloads;

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: new Map(),
  activeDownloads: new Set(),
  downloadedEpisodes: [],
  isLoadingDownloads: false,

  addDownload: (download) =>
    set((state) => {
      const newDownloads = new Map(state.downloads);
      newDownloads.set(download.id, download);
      return { downloads: newDownloads };
    }),

  updateDownload: (id, updates) =>
    set((state) => {
      const newDownloads = new Map(state.downloads);
      const existing = newDownloads.get(id);
      if (existing) {
        newDownloads.set(id, { ...existing, ...updates });
      }
      return { downloads: newDownloads };
    }),

  removeDownload: (id) =>
    set((state) => {
      const newDownloads = new Map(state.downloads);
      const newActiveDownloads = new Set(state.activeDownloads);
      newDownloads.delete(id);
      newActiveDownloads.delete(id);
      return {
        downloads: newDownloads,
        activeDownloads: newActiveDownloads,
      };
    }),

  getDownload: (id) => get().downloads.get(id),

  getAllDownloads: () => Array.from(get().downloads.values()),

  // Load downloaded episodes from AsyncStorage
  loadDownloadedEpisodes: async () => {
    console.log('[DownloadStore] Loading downloaded episodes...');
    set({ isLoadingDownloads: true });
    try {
      const stored = await AsyncStorage.getItem(DOWNLOADS_KEY);
      const episodes: DownloadedEpisode[] = stored ? JSON.parse(stored) : [];
      console.log('[DownloadStore] Loaded', episodes.length, 'downloaded episodes');
      set({ downloadedEpisodes: episodes, isLoadingDownloads: false });
    } catch (error) {
      console.error('[DownloadStore] Failed to load downloaded episodes:', error);
      set({ isLoadingDownloads: false });
    }
  },

  // Add a downloaded episode to the list
  addDownloadedEpisode: (episode) => {
    console.log('[DownloadStore] Adding downloaded episode:', episode.title);
    set((state) => {
      // Check if already exists
      if (state.downloadedEpisodes.some(e => e.id === episode.id)) {
        return state;
      }
      return { downloadedEpisodes: [...state.downloadedEpisodes, episode] };
    });
  },

  // Remove a downloaded episode from the list (and from active downloads if present)
  removeDownloadedEpisode: (episodeId) => {
    console.log('[DownloadStore] Removing downloaded episode:', episodeId);
    set((state) => {
      // Also remove from downloads Map if present (might have status 'completed')
      const newDownloads = new Map(state.downloads);
      // Find and remove any download entries for this episode
      for (const [key, download] of newDownloads) {
        if (download.episodeId === episodeId) {
          newDownloads.delete(key);
        }
      }
      return {
        downloads: newDownloads,
        downloadedEpisodes: state.downloadedEpisodes.filter(e => e.id !== episodeId),
      };
    });
  },

  // Check if an episode is downloaded
  isEpisodeDownloaded: (episodeId) => {
    return get().downloadedEpisodes.some(e => e.id === episodeId);
  },
}));

export class DownloadService {
  private downloadDir: string;
  private maxConcurrentDownloads = 3;

  constructor() {
    // Set download directory
    this.downloadDir = `${FileSystem.documentDirectory}downloads/`;
    this.ensureDownloadDirectory();
  }

  // Sanitize episode ID to create a valid filename (remove colons, slashes, etc.)
  private sanitizeForFilename(id: string): string {
    return id
      .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace invalid chars with underscore
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Trim underscores from start/end
  }

  private async ensureDownloadDirectory(): Promise<void> {
    console.log('[Download] ensureDownloadDirectory called, dir:', this.downloadDir);
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.downloadDir);
      console.log('[Download] Directory info:', dirInfo);
      if (!dirInfo.exists) {
        console.log('[Download] Creating download directory...');
        await FileSystem.makeDirectoryAsync(this.downloadDir, { intermediates: true });
        console.log('[Download] Directory created successfully');
      }
    } catch (error) {
      console.error('[Download] Failed to create download directory:', error);
    }
  }

  // Queue a download
  async queueDownload(episode: {
    id: string;
    title: string;
    audioUrl: string;
    podcastTitle?: string;
    artwork?: string;
    description?: string;
  }): Promise<string> {
    console.log('[Download] queueDownload called with:', {
      id: episode.id,
      title: episode.title,
      audioUrl: episode.audioUrl,
      podcastTitle: episode.podcastTitle,
      artwork: episode.artwork,
    });

    const safeId = this.sanitizeForFilename(episode.id);
    const downloadId = `download_${safeId}_${Date.now()}`;
    const fileName = `${safeId}.mp3`;
    const filePath = `${this.downloadDir}${fileName}`;

    console.log('[Download] Sanitized ID:', { original: episode.id, sanitized: safeId });

    console.log('[Download] Generated paths:', {
      downloadId,
      fileName,
      filePath,
      downloadDir: this.downloadDir,
    });

    // Check if already downloaded
    const exists = await this.isDownloaded(episode.id);
    console.log('[Download] Already downloaded?', exists);
    if (exists) {
      console.log('Episode already downloaded:', episode.id);
      return downloadId;
    }

    const download: Download = {
      id: downloadId,
      episodeId: episode.id,
      url: episode.audioUrl,
      filePath,
      progress: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      status: 'queued',
      metadata: {
        title: episode.title,
        podcastTitle: episode.podcastTitle || '',
        artwork: episode.artwork || '',
        description: episode.description || '',
      },
    };

    useDownloadStore.getState().addDownload(download);
    await this.processQueue();

    return downloadId;
  }

  // Process download queue
  private async processQueue(): Promise<void> {
    const state = useDownloadStore.getState();
    const activeCount = state.activeDownloads.size;

    if (activeCount >= this.maxConcurrentDownloads) {
      return; // Already at max concurrent downloads
    }

    const queuedDownloads = state.getAllDownloads().filter(
      (d) => d.status === 'queued'
    );

    const toStart = queuedDownloads.slice(
      0,
      this.maxConcurrentDownloads - activeCount
    );

    for (const download of toStart) {
      await this.startDownload(download.id);
    }
  }

  // Start a download
  private async startDownload(downloadId: string): Promise<void> {
    console.log('[Download] startDownload called for:', downloadId);

    const download = useDownloadStore.getState().getDownload(downloadId);
    if (!download) {
      console.log('[Download] No download found for id:', downloadId);
      return;
    }

    console.log('[Download] Starting download:', {
      url: download.url,
      filePath: download.filePath,
      episodeId: download.episodeId,
    });

    useDownloadStore.getState().updateDownload(downloadId, {
      status: 'downloading',
    });

    const state = useDownloadStore.getState();
    state.activeDownloads.add(downloadId);

    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
      const progress = downloadProgress.totalBytesExpectedToWrite > 0
        ? (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
        : 0;

      useDownloadStore.getState().updateDownload(downloadId, {
        progress,
        downloadedBytes: downloadProgress.totalBytesWritten,
        totalBytes: downloadProgress.totalBytesExpectedToWrite,
      });
    };

    try {
      console.log('[Download] Creating downloadResumable...');
      const downloadResumable = FileSystem.createDownloadResumable(
        download.url,
        download.filePath,
        {},
        callback
      );

      useDownloadStore.getState().updateDownload(downloadId, {
        downloadResumable,
      });

      console.log('[Download] Calling downloadAsync...');
      const result = await downloadResumable.downloadAsync();
      console.log('[Download] downloadAsync result:', result);

      if (result) {
        console.log('[Download] Download completed successfully');
        useDownloadStore.getState().updateDownload(downloadId, {
          status: 'completed',
          progress: 100,
        });

        // Save download record to AsyncStorage
        await this.saveDownloadRecord(download.episodeId, download.filePath, download.metadata);
      } else {
        console.log('[Download] downloadAsync returned null/undefined');
      }
    } catch (error) {
      console.error('[Download] Download error:', error);
      console.error('[Download] Error details:', {
        name: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      useDownloadStore.getState().updateDownload(downloadId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Download failed',
      });
    } finally {
      const state = useDownloadStore.getState();
      state.activeDownloads.delete(downloadId);

      // Process next in queue
      await this.processQueue();
    }
  }

  // Pause a download
  async pauseDownload(downloadId: string): Promise<void> {
    const download = useDownloadStore.getState().getDownload(downloadId);
    if (!download || !download.downloadResumable) return;

    try {
      const pauseData = await download.downloadResumable.pauseAsync();
      await FileSystem.writeAsStringAsync(
        `${this.downloadDir}${downloadId}.resume`,
        JSON.stringify(pauseData)
      );

      useDownloadStore.getState().updateDownload(downloadId, {
        status: 'paused',
      });

      const state = useDownloadStore.getState();
      state.activeDownloads.delete(downloadId);

      await this.processQueue();
    } catch (error) {
      console.error('Failed to pause download:', error);
    }
  }

  // Resume a download
  async resumeDownload(downloadId: string): Promise<void> {
    const download = useDownloadStore.getState().getDownload(downloadId);
    if (!download || download.status !== 'paused') return;

    try {
      const resumeDataPath = `${this.downloadDir}${downloadId}.resume`;
      const resumeDataString = await FileSystem.readAsStringAsync(resumeDataPath);
      const resumeData = JSON.parse(resumeDataString);

      const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
        const progress = downloadProgress.totalBytesExpectedToWrite > 0
          ? (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
          : 0;

        useDownloadStore.getState().updateDownload(downloadId, {
          progress,
          downloadedBytes: downloadProgress.totalBytesWritten,
          totalBytes: downloadProgress.totalBytesExpectedToWrite,
        });
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        download.url,
        download.filePath,
        {},
        callback,
        resumeData
      );

      useDownloadStore.getState().updateDownload(downloadId, {
        status: 'downloading',
        downloadResumable,
      });

      const state = useDownloadStore.getState();
      state.activeDownloads.add(downloadId);

      const result = await downloadResumable.resumeAsync();

      if (result) {
        useDownloadStore.getState().updateDownload(downloadId, {
          status: 'completed',
          progress: 100,
        });

        // Clean up resume file
        await FileSystem.deleteAsync(resumeDataPath, { idempotent: true });
      }
    } catch (error) {
      console.error('Failed to resume download:', error);
      useDownloadStore.getState().updateDownload(downloadId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Resume failed',
      });
    } finally {
      const state = useDownloadStore.getState();
      state.activeDownloads.delete(downloadId);
      await this.processQueue();
    }
  }

  // Cancel a download
  async cancelDownload(downloadId: string): Promise<void> {
    const download = useDownloadStore.getState().getDownload(downloadId);
    if (!download) return;

    if (download.downloadResumable) {
      try {
        await download.downloadResumable.pauseAsync();
      } catch (error) {
        console.error('Failed to stop download:', error);
      }
    }

    // Delete partial file if exists
    try {
      await FileSystem.deleteAsync(download.filePath, { idempotent: true });
    } catch (error) {
      console.error('Failed to delete partial file:', error);
    }

    useDownloadStore.getState().removeDownload(downloadId);

    const state = useDownloadStore.getState();
    state.activeDownloads.delete(downloadId);

    await this.processQueue();
  }

  // Check if episode is downloaded
  async isDownloaded(episodeId: string): Promise<boolean> {
    const safeId = this.sanitizeForFilename(episodeId);
    const filePath = `${this.downloadDir}${safeId}.mp3`;
    console.log('[Download] isDownloaded check for:', { episodeId, safeId, filePath });
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      console.log('[Download] isDownloaded fileInfo:', fileInfo);
      return fileInfo.exists;
    } catch (error) {
      console.error('[Download] isDownloaded error:', error);
      return false;
    }
  }

  // Get downloaded file path
  async getDownloadedFilePath(episodeId: string): Promise<string | null> {
    const safeId = this.sanitizeForFilename(episodeId);
    const filePath = `${this.downloadDir}${safeId}.mp3`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists ? filePath : null;
  }

  // Delete downloaded file
  async deleteDownload(episodeId: string): Promise<void> {
    const safeId = this.sanitizeForFilename(episodeId);
    const filePath = `${this.downloadDir}${safeId}.mp3`;

    console.log('[Download] deleteDownload called:', { episodeId, safeId, filePath });

    try {
      // Check if file exists before delete
      const beforeInfo = await FileSystem.getInfoAsync(filePath);
      console.log('[Download] File before delete:', beforeInfo);

      await FileSystem.deleteAsync(filePath, { idempotent: true });

      // Verify file was deleted
      const afterInfo = await FileSystem.getInfoAsync(filePath);
      console.log('[Download] File after delete:', afterInfo);

      if (afterInfo.exists) {
        console.error('[Download] File still exists after deleteAsync!');
      }

      await this.removeDownloadRecord(episodeId);
      console.log('[Download] Delete completed successfully');
    } catch (error) {
      console.error('[Download] Failed to delete download:', error);
      throw error;
    }
  }

  // Get storage info
  async getStorageInfo(): Promise<{
    totalSpace: number;
    freeSpace: number;
    usedSpace: number;
  }> {
    const freeSpace = await FileSystem.getFreeDiskStorageAsync();
    const totalSpace = await FileSystem.getTotalDiskCapacityAsync();

    return {
      totalSpace: totalSpace || 0,
      freeSpace: freeSpace || 0,
      usedSpace: (totalSpace || 0) - (freeSpace || 0),
    };
  }

  // Clean up old downloads
  async cleanupOldDownloads(daysToKeep: number = 30): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.downloadDir);
      const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = `${this.downloadDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists && fileInfo.modificationTime && fileInfo.modificationTime < cutoffDate) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      }
    } catch (error) {
      console.error('Failed to cleanup downloads:', error);
    }
  }

  // Save download metadata to AsyncStorage AND update store
  private async saveDownloadRecord(
    episodeId: string,
    filePath: string,
    metadata?: { title: string; podcastTitle: string; artwork: string; description?: string }
  ): Promise<void> {
    console.log('[Download] saveDownloadRecord:', { episodeId, filePath, metadata });
    try {
      const stored = await AsyncStorage.getItem(DOWNLOADS_KEY);
      const downloads = stored ? JSON.parse(stored) : [];

      // Check if already saved
      const exists = downloads.some((d: { id: string }) => d.id === episodeId);
      if (exists) {
        console.log('[Download] Record already exists for:', episodeId);
        return;
      }

      const newDownload: DownloadedEpisode = {
        id: episodeId,
        title: metadata?.title || 'Unknown',
        podcastTitle: metadata?.podcastTitle || 'Unknown Podcast',
        artwork: metadata?.artwork || '',
        localPath: filePath,
        downloadedAt: Date.now(),
        description: metadata?.description || '',
      };

      downloads.push(newDownload);
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
      console.log('[Download] Saved download record successfully');

      // Update store for reactive UI updates
      useDownloadStore.getState().addDownloadedEpisode(newDownload);
    } catch (error) {
      console.error('[Download] Failed to save download record:', error);
    }
  }

  private async removeDownloadRecord(episodeId: string): Promise<void> {
    console.log('[Download] removeDownloadRecord:', episodeId);
    try {
      const stored = await AsyncStorage.getItem(DOWNLOADS_KEY);
      if (!stored) return;

      const downloads = JSON.parse(stored);
      const filtered = downloads.filter((d: { id: string }) => d.id !== episodeId);
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(filtered));
      console.log('[Download] Removed download record successfully');

      // Update store for reactive UI updates
      useDownloadStore.getState().removeDownloadedEpisode(episodeId);
    } catch (error) {
      console.error('[Download] Failed to remove download record:', error);
    }
  }
}

// Singleton instance
export const downloadService = new DownloadService();