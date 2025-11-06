import { Ionicons } from '@expo/vector-icons';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CommentsHeaderProps {
  commentCount?: number;
  onDismiss?: () => void;
  onViewAll?: () => void;
  showDismiss?: boolean;
  showViewAll?: boolean;
  dragHandlers?: object;
}

export function CommentsHeader({
  commentCount = 0,
  onDismiss,
  onViewAll,
  showDismiss = false,
  showViewAll = false,
  dragHandlers,
}: CommentsHeaderProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  return (
    <View style={[styles.header, dragHandlers]} {...(dragHandlers || {})}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}>
          Comments
        </Text>
        <Text style={styles.commentCount}>({commentCount})</Text>
      </View>
      <View style={styles.headerButtons}>
        {showDismiss && onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={24} color="#8B8680" />
          </TouchableOpacity>
        )}
        {showViewAll && onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAllButton}>View all</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
  },
  commentCount: {
    fontSize: 12,
    fontFamily: 'aristata',
    color: '#E05F4E',
    position: 'relative',
    top: 8,
    marginLeft: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dismissButton: {
    padding: 4,
  },
  viewAllButton: {
    fontSize: 14,
    color: '#E05F4E',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});