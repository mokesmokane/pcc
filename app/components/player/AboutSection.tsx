import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AboutSectionProps {
  description?: string;
}

export function AboutSection({ description }: AboutSectionProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const [expanded, setExpanded] = useState(false);

  if (!description) {
    return null;
  }

  // Strip HTML tags for display
  const cleanDescription = description.replace(/<[^>]*>/g, '');
  const isLong = cleanDescription.length > 150;
  const displayText = expanded || !isLong
    ? cleanDescription
    : cleanDescription.slice(0, 150).trim() + '...';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
          About
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.description}>
          {displayText}
          {isLong && !expanded && (
            <Text style={styles.readMore} onPress={() => setExpanded(true)}>
              {' '}read more
            </Text>
          )}
        </Text>
        {expanded && isLong && (
          <TouchableOpacity onPress={() => setExpanded(false)}>
            <Text style={styles.readMore}>show less</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#403837',
  },
  readMore: {
    color: '#E05F4E',
    fontWeight: '600',
  },
});
