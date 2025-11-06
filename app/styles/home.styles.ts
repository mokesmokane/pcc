import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F4F1ED',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
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
    title: {
      fontSize: 28,
      fontFamily: 'PaytoneOne_400Regular',
      color: '#E05F4E',
    },
    menuButton: {
      padding: 8,
    },
    scrollView: {
      paddingHorizontal: 20,
      flex: 1, 
    },
    scrollContent: {
      paddingTop: 0,
      paddingBottom: 40,
    },
    sectionWrapper: {
      marginBottom: 12,
    },
    headerContainer: {
      paddingBottom: 16,
    },
    welcomeTitle: {
      fontSize: 32,
      fontFamily: 'PaytoneOne_400Regular',
      color: '#E05F4E',
      marginBottom: 4,
      lineHeight: 36,
      includeFontPadding: false,
    },
    welcomeSubtitle: {
      fontSize: 15,
      color: '#6B5E57',
      fontWeight: '500',
    },
  });