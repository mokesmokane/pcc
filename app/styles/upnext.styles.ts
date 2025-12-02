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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8B8680',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    marginTop: 8,
  },
  queueItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  queueItemCurrent: {
    backgroundColor: '#FFF5F3',
    borderWidth: 2,
    borderColor: '#E05F4E',
  },
  trackNumber: {
    width: 24,
    fontSize: 14,
    fontWeight: '600',
    color: '#8B8680',
    textAlign: 'center',
    marginRight: 8,
  },
  trackNumberCurrent: {
    color: '#E05F4E',
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  artworkContainer: {
    position: 'relative',
  },
  nowPlayingBadge: {
    position: 'absolute',
    bottom: -4,
    right: 8,
    backgroundColor: '#E05F4E',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 13,
    color: '#8B8680',
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBackground: {
    width: 60,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E05F4E',
    borderRadius: 2,
  },
  progressFillCompleted: {
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 11,
    color: '#8B8680',
  },
  progressTextCompleted: {
    color: '#4CAF50',
  },
  removeHint: {
    fontSize: 12,
    color: '#8B8680',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
});
