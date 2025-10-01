import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  content: {
    flex: 1,
  },
  podcastImage: {
    width: 180,
    height: 180,
    backgroundColor: '#E8E5E1',
    borderRadius: 24,
    marginLeft: 24,
    marginTop: 32,
    marginBottom: 24,
  },
  podcastInfo: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#E05F4E',
  },
  categoryText: {
    fontSize: 14,
    color: '#E05F4E',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 8,
    color: '#E05F4E',
  },
  source: {
    fontSize: 16,
    color: '#403837',
    marginBottom: 8,
    fontWeight: '600',
  },
  membersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fireEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  membersText: {
    fontSize: 14,
    color: '#8B8680',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#E05F4E',
  },
  sectionText: {
    fontSize: 15,
    color: '#403837',
    lineHeight: 22,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F4F1ED',
  },
  chooseButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E05F4E',
  },
  placeholderImage: {
    backgroundColor: '#E8E5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8B8680',
  },
});