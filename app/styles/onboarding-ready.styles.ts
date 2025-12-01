import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E05F4E',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  gifContainer: {
    width: screenWidth - 48,
    height: screenWidth - 48,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#D14D3D',
    marginBottom: 32,
  },
  gif: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 36,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 26,
  },
});
