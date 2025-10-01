import { create } from 'zustand';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

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
}

interface DownloadState {
  downloads: Map<string, Download>;
  activeDownloads: Set<string>;

  // Actions
  addDownload: (download: Download) => void;
  updateDownload: (id: string, updates: Partial<Download>) => void;
  removeDownload: (id: string) => void;
  getDownload: (id: string) => Download | undefined;
  getAllDownloads: () => Download[];
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: new Map(),
  activeDownloads: new Set(),

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
}));

export class DownloadService {
  private downloadDir: string;
  private maxConcurrentDownloads = 3;

  constructor() {
    // Set download directory
    this.downloadDir = `${FileSystem.documentDirectory}downloads/`;
    this.ensureDownloadDirectory();
  }

  private async ensureDownloadDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.downloadDir, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to create download directory:', error);
    }
  }

  // Queue a download
  async queueDownload(episode: {
    id: string;
    title: string;
    audioUrl: string;
  }): Promise<string> {
    const downloadId = `download_${episode.id}_${Date.now()}`;
    const fileName = `${episode.id}.mp3`;
    const filePath = `${this.downloadDir}${fileName}`;

    // Check if already downloaded
    const exists = await this.isDownloaded(episode.id);
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
    const download = useDownloadStore.getState().getDownload(downloadId);
    if (!download) return;

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
      const downloadResumable = FileSystem.createDownloadResumable(
        download.url,
        download.filePath,
        {},
        callback
      );

      useDownloadStore.getState().updateDownload(downloadId, {
        downloadResumable,
      });

      const result = await downloadResumable.downloadAsync();

      if (result) {
        useDownloadStore.getState().updateDownload(downloadId, {
          status: 'completed',
          progress: 100,
        });

        // Save download record to database
        await this.saveDownloadRecord(download.episodeId, download.filePath);
      }
    } catch (error) {
      console.error('Download error:', error);
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
    const filePath = `${this.downloadDir}${episodeId}.mp3`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists;
  }

  // Get downloaded file path
  async getDownloadedFilePath(episodeId: string): Promise<string | null> {
    const filePath = `${this.downloadDir}${episodeId}.mp3`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists ? filePath : null;
  }

  // Delete downloaded file
  async deleteDownload(episodeId: string): Promise<void> {
    const filePath = `${this.downloadDir}${episodeId}.mp3`;

    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      await this.removeDownloadRecord(episodeId);
    } catch (error) {
      console.error('Failed to delete download:', error);
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

  // Database operations (to be implemented with actual DB)
  private async saveDownloadRecord(
    episodeId: string,
    filePath: string
  ): Promise<void> {
    // TODO: Save to database
    console.log('Save download record:', episodeId, filePath);
  }

  private async removeDownloadRecord(episodeId: string): Promise<void> {
    // TODO: Remove from database
    console.log('Remove download record:', episodeId);
  }
}

// Singleton instance
export const downloadService = new DownloadService();