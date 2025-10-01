import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48; // Allow next card to peek - increased card size for smaller screens

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B8680',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
    marginBottom: 8,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    color: '#403837',
    lineHeight: 22,
  },
  logoutButton: {
    padding: 8,
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'stretch',
    paddingBottom: 20,
  },
  cardsWrapper: {
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight: 16,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 16,
    height: 420,
  },
  cardContent: {
    backgroundColor: '#E6DED3',
    borderRadius: 24,
    padding: 24,
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    marginBottom: 0,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  podcastImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#E8E5E1',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#E8E5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#8B8680',
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  spinnerCategoryPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E05F4E',
  },
  spinnerCategoryText: {
    fontSize: 14,
    color: '#E05F4E',
    fontWeight: '600',
  },
  spinnerTitle: {
    color: '#E05F4E',
    fontSize: 32,
    lineHeight: 38,
  },
  spinnerSubtitle: {
    fontSize: 16,
    color: '#403837',
    marginTop: 8,
  },
  starBurst: {
    position: 'absolute',
    top: 10,
    left: 90,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#8B8680',
    marginBottom: 12,
    backgroundColor: '#F4F1ED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  podcastTitle: {
    fontSize: 24,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#403837',
    marginBottom: 4,
    lineHeight: 28,
  },
  podcastSource: {
    fontSize: 16,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 16,
  },
  metaContainer: {
    marginBottom: 0,
  },
  membersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fireEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  membersText: {
    fontSize: 14,
    color: '#8B8680',
  },
  tellMeMoreButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#403837',
    marginTop: 16,
  },
  tellMeMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#403837',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingBottom: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4D1CD',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#E05F4E',
    width: 24,
  },
  listenButton: {
    backgroundColor: '#E05F4E',
    borderColor: '#E05F4E',
  },
  listenButtonText: {
    color: '#FFFFFF',
  },
});

export { CARD_WIDTH };