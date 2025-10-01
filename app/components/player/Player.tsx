import React from 'react';
import { AlbumArtwork } from './AlbumArtwork';
import { TrackInfo } from './TrackInfo';
import { SeekBar } from './SeekBar';
import { PlaybackControls } from './PlaybackControls';

interface PlayerProps {
  // Track info
  artwork?: string;
  title?: string;
  artist?: string;
  episodeId?: string;

  // Download state
  isDownloaded: boolean;
  isDownloading: boolean;
  onDownload: () => void;

  // Playback state
  isPlaying: boolean;
  playbackRate: number;

  // Playback controls
  onPlayPause: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onSpeedPress: () => void;
  onSleepTimerPress: () => void;
  onSharePress?: () => void;
  onDownloadPress?: () => void;

  // Preview mode (for traditional player)
  previewPosition?: number;
  previewDuration?: number;
}

export function Player({
  artwork,
  title,
  artist,
  episodeId,
  isDownloaded,
  isDownloading,
  onDownload,
  isPlaying,
  playbackRate,
  onPlayPause,
  onSkipForward,
  onSkipBackward,
  onSpeedPress,
  onSleepTimerPress,
  onSharePress,
  onDownloadPress,
  previewPosition,
  previewDuration,
}: PlayerProps) {
  return (
    <>
      <AlbumArtwork uri={artwork} />

      <TrackInfo
        title={title}
        artist={artist}
        isDownloaded={isDownloaded}
        isDownloading={isDownloading}
        onDownload={onDownload}
        episodeId={episodeId}
      />

      <SeekBar
        overridePosition={previewPosition}
        overrideDuration={previewDuration}
      />

      <PlaybackControls
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        isDownloaded={isDownloaded}
        onPlayPause={onPlayPause}
        onSkipForward={onSkipForward}
        onSkipBackward={onSkipBackward}
        onSpeedPress={onSpeedPress}
        onSleepTimerPress={onSleepTimerPress}
        onSharePress={onSharePress}
        onDownloadPress={onDownloadPress}
      />
    </>
  );
}