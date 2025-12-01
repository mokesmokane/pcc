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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    color: '#403837',
    lineHeight: 22,
  },
  checkboxContainer: {
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(44, 40, 38, 0.1)',
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
  nextButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonEnabled: {
    backgroundColor: '#E05F4E',
  },
  nextButtonDisabled: {
    backgroundColor: '#F0CFC5',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
