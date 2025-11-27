import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './app/services/audio/trackPlayerService';

// Register the playback service - MUST be before app registration
TrackPlayer.registerPlaybackService(() => PlaybackService);

// Original expo-router entry
import 'expo-router/entry';
