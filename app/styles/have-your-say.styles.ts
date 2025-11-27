import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8B8680',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
    marginBottom: 8,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B5E57',
    lineHeight: 22,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#403837',
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E05F4E',
  },
  // Conversation starter cards
  starterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  starterCardContent: {
    flex: 1,
    marginRight: 12,
  },
  starterQuestion: {
    fontSize: 15,
    color: '#403837',
    fontWeight: '500',
    lineHeight: 22,
  },
  starterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  starterCommentCount: {
    fontSize: 13,
    color: '#8B8680',
  },
  starterIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Poll button
  pollButton: {
    backgroundColor: '#E05F4E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  pollButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pollButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E05F4E',
    marginTop: 12,
  },
  pollButtonSecondaryText: {
    color: '#E05F4E',
  },
  // Comments preview
  commentsPreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  // Empty states
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8B8680',
  },
});
