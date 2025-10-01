import { StyleSheet } from "react-native";
import { Dimensions } from "react-native";

const { width: screenWidth } = Dimensions.get('window');

export const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F4F1ED',
    },
    mainContent: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: '#E05F4E',
      fontWeight: '600',
    },
    header: {
      paddingBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      width: '100%',
    },
    brandName: {
      fontSize: 24,
      fontFamily: 'PaytoneOne_400Regular',
      lineHeight: 26,
      color: '#E05F4E',
      letterSpacing: -1,
    },
    progressContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 8,
      marginBottom: 4,
      gap: 8,
    },
    progressBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#E8DED5',
    },
    progressBarActive: {
      backgroundColor: '#E05F4E',
    },
    slide: {
      width: screenWidth,
      flex: 1,
      paddingHorizontal: 24,
      flexDirection: 'column',
      paddingTop: 8,
    },
    imageContainer: {
      marginBottom: 20,
      alignItems: 'center',
    },
    imageWindow: {
      width: Math.min(screenWidth - 48, 280),
      height: Math.min(screenWidth - 48, 280),
      backgroundColor: '#E8DED5',
      borderTopLeftRadius: 200,
      borderTopRightRadius: 200,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'visible',
    },
    onboardingImage: {
      width: '100%',
      height: '100%',
      borderTopLeftRadius: 200,
      borderTopRightRadius: 200,
    },
    slideContent: {
      flex: 1,
    },
    slideTitle: {
      fontSize: 32,
      fontFamily: 'PaytoneOne_400Regular',
      lineHeight: 38,
      marginBottom: 12,
      color: '#E05F4E',
    },
    slideDescription: {
      fontSize: 16,
      lineHeight: 24,
      color: '#403837',
    },
    buttonContainer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 16,
      gap: 12,
      backgroundColor: '#F4F1ED',
    },
    loginButton: {
      flex: 1,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: '#403837',
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loginButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#403837',
    },
    joinButton: {
      flex: 1,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#E05F4E',
      justifyContent: 'center',
      alignItems: 'center',
    },
    joinButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    adminButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#E8DED5',
      borderRadius: 8,
    },
    adminButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#E05F4E',
    },
    shapeContainer: {
      position: 'absolute',
      top: -25,
      right: 15,
    },
    rectanglesShapeContainer: {
      top: -30,
      right: 25,
    },
    starShapeContainer: {
      top: -35,
      right: 10,
    },
    rectanglesContainer: {
      flexDirection: 'row',
      gap: 8,
    },
  });