import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface AlbumArtworkProps {
  uri?: string;
  size?: 'full' | 'mini';
}

export function AlbumArtwork({ uri, size = 'full' }: AlbumArtworkProps) {
  if (size === 'mini') {
    return uri ? (
      <Image source={{ uri }} style={styles.miniArtwork} />
    ) : (
      <View style={[styles.miniArtwork, styles.placeholder]} />
    );
  }

  return (
    <View style={styles.container}>
      {uri ? (
        <Image source={{ uri }} style={styles.artwork} />
      ) : (
        <View style={[styles.artwork, styles.placeholder]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#E8E5E1',
  },
  miniArtwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#E8E5E1',
  },
  placeholder: {
    backgroundColor: '#E8E5E1',
  },
});