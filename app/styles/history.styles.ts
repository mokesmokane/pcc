import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: '#F4F1ED',
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14,
    color: '#403837',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra space for MiniPlayer
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#403837',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F4F1ED',
  },
});