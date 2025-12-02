import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 10,
    backgroundColor: '#F4F1ED',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  manageButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  tabActive: {
    backgroundColor: '#E05F4E',
    borderColor: '#E05F4E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B8680',
  },
  tabTextActive: {
    color: '#FFFFFF',
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
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  artworkContainer: {
    position: 'relative',
  },
  clubBadge: {
    position: 'absolute',
    top: -4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 4,
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
