import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, usePathname, useSegments } from 'expo-router';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { useWeeklySelections } from './contexts/WeeklySelectionsContext';

export default function SplashScreen() {
  const { user, loading } = useAuth();
  const { userChoice, userChoiceLoaded } = useWeeklySelections();
  const pathname = usePathname();
  const segments = useSegments();
  const hasNavigated = useRef(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const checkUserAndRoute = async () => {
      // Prevent multiple navigations
      if (hasNavigated.current) return;

      // Don't navigate if we're on success screen or other screens
      if (pathname === '/success') {
        return;
      }

      // Don't navigate if we're already on another screen (not the index)
      if (segments.length > 0 && segments[0] !== 'index' && pathname !== '/') {
        return;
      }

      // Wait for both auth and user choice to load
      if (loading || !userChoiceLoaded) return;

      // Only navigate on initial mount, not on auth state changes
      if (!isInitialMount.current) {
        return;
      }

      hasNavigated.current = true;
      isInitialMount.current = false;

      if (!user) {
        // No user, go to onboarding
        router.replace('/(auth)/onboarding');
        return;
      }
      router.replace('/home');
    };

    checkUserAndRoute();
  }, [user, loading, userChoice, userChoiceLoaded, pathname, segments]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brandNameCream}>POD</Text>
        <Text style={styles.brandNameCream}>CAST</Text>
        <Text style={styles.brandNameWhite}>CLUB</Text>
        <Text style={styles.tagline}>LISTEN. DISCUSS.{'\n'}GROW. TOGETHER.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E05F4E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  brandNameCream: {
    fontSize: 80,
    fontFamily: 'GrandBold',
    lineHeight: 84,
    color: '#E5DFD3',
    textAlign: 'center',
  },
  brandNameWhite: {
    fontSize: 80,
    fontFamily: 'GrandBold',
    lineHeight: 84,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.5,
  },
  tagline: {
    fontSize: 20,
    fontFamily: 'Caveat_400Regular',
    lineHeight: 28,
    color: '#F8F6F3',
    textAlign: 'center',
    marginTop: 24,
  },
});