import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 120,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
    marginBottom: 8,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B5E57',
    marginBottom: 32,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E8E5E1',
    gap: 6,
  },
  tagSelected: {
    backgroundColor: '#FFF5F4',
    borderColor: '#E05F4E',
  },
  tagEmoji: {
    fontSize: 16,
  },
  tagLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#403837',
  },
  tagLabelSelected: {
    color: '#E05F4E',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: '#F4F1ED',
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonEnabled: {
    backgroundColor: '#E05F4E',
  },
  submitButtonDisabled: {
    backgroundColor: '#F0CFC5',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitButtonIcon: {
    fontSize: 16,
  },
});
