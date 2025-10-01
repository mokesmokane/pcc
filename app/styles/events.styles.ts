import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    // paddingVertical: 12,
    marginTop: Platform.OS === 'android' ? 25 : 0,
  },
  iconButton: {
    padding: 4,
  },
  inviteButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 100, // Extra space for MiniPlayer
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#F4F1ED',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B8680',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 14,
    color: '#403837',
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#E05F4E',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 20,
    width: '100%',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});