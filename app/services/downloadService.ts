import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DownloadedEpisode {
  id: string;
  title: string;
  podcast_title: string;
  localPath: string;
  artwork_url?: string;
  downloadedAt: string;
  fileSize?: number;
}

class DownloadService {
  private downloadDir = `${FileSystem.documentDirectory}podcasts/`;
  private downloadTasks = new Map<string, FileSystem.DownloadResumable>();

  // Sanitize episode ID to create a valid filename
  private sanitizeForFilename(id: string): string {
    return id
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  async ensureDirectoryExists() {
    const dirInfo = await FileSystem.getInfoAsync(this.downloadDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.downloadDir, { intermediates: true });
    }
  }

  async downloadEpisode(
    episodeId: string,
    audioUrl: string,
    episodeData: {
      title: string;
      podcast_title: string;
      artwork_url?: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<string> {
    await this.ensureDirectoryExists();

    const safeId = this.sanitizeForFilename(episodeId);
    const fileName = `${safeId}.mp3`;
    const localPath = `${this.downloadDir}${fileName}`;

    // Check if already downloaded
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      console.log('Episode already downloaded:', localPath);
      return localPath;
    }

    // Create download task
    const downloadResumable = FileSystem.createDownloadResumable(
      audioUrl,
      localPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress?.(progress);
      }
    );

    // Store download task for cancellation
    this.downloadTasks.set(episodeId, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();

      if (result) {
        // Save download info to AsyncStorage
        const downloadInfo: DownloadedEpisode = {
          id: episodeId,
          title: episodeData.title,
          podcast_title: episodeData.podcast_title,
          localPath: result.uri,
          artwork_url: episodeData.artwork_url,
          downloadedAt: new Date().toISOString(),
          fileSize: result.headers?.['content-length'] ? parseInt(result.headers['content-length']) : undefined,
        };

        await this.saveDownloadInfo(downloadInfo);
        this.downloadTasks.delete(episodeId);

        return result.uri;
      }

      throw new Error('Download failed');
    } catch (error) {
      this.downloadTasks.delete(episodeId);
      throw error;
    }
  }

  async cancelDownload(episodeId: string) {
    const task = this.downloadTasks.get(episodeId);
    if (task) {
      await task.pauseAsync();
      this.downloadTasks.delete(episodeId);
    }
  }

  async deleteDownload(episodeId: string) {
    const safeId = this.sanitizeForFilename(episodeId);
    const localPath = `${this.downloadDir}${safeId}.mp3`;

    try {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      await this.removeDownloadInfo(episodeId);
    } catch (error) {
      console.error('Error deleting download:', error);
    }
  }

  async getDownloadedEpisodes(): Promise<DownloadedEpisode[]> {
    try {
      const downloadsJson = await AsyncStorage.getItem('downloaded_episodes');
      return downloadsJson ? JSON.parse(downloadsJson) : [];
    } catch (error) {
      console.error('Error getting downloaded episodes:', error);
      return [];
    }
  }

  async getDownloadedEpisode(episodeId: string): Promise<DownloadedEpisode | null> {
    const downloads = await this.getDownloadedEpisodes();
    return downloads.find(d => d.id === episodeId) || null;
  }

  async isEpisodeDownloaded(episodeId: string): Promise<boolean> {
    const download = await this.getDownloadedEpisode(episodeId);
    if (!download) return false;

    // Verify file still exists using sanitized filename
    const safeId = this.sanitizeForFilename(episodeId);
    const localPath = `${this.downloadDir}${safeId}.mp3`;
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists;
    } catch (error) {
      console.error('[DownloadService] isEpisodeDownloaded error:', error);
      return false;
    }
  }

  private async saveDownloadInfo(downloadInfo: DownloadedEpisode) {
    const downloads = await this.getDownloadedEpisodes();
    const updatedDownloads = [...downloads.filter(d => d.id !== downloadInfo.id), downloadInfo];
    await AsyncStorage.setItem('downloaded_episodes', JSON.stringify(updatedDownloads));
  }

  private async removeDownloadInfo(episodeId: string) {
    const downloads = await this.getDownloadedEpisodes();
    const updatedDownloads = downloads.filter(d => d.id !== episodeId);
    await AsyncStorage.setItem('downloaded_episodes', JSON.stringify(updatedDownloads));
  }

  async getDownloadSize(): Promise<number> {
    const downloads = await this.getDownloadedEpisodes();
    let totalSize = 0;

    for (const download of downloads) {
      try {
        const safeId = this.sanitizeForFilename(download.id);
        const localPath = `${this.downloadDir}${safeId}.mp3`;
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists && 'size' in fileInfo) {
          totalSize += fileInfo.size;
        }
      } catch (error) {
        console.error('Error getting file size:', error);
      }
    }

    return totalSize;
  }
}

export const downloadService = new DownloadService();