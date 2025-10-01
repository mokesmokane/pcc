import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { styles } from './onboarding.styles';

const { width: screenWidth } = Dimensions.get('window');

const onboardingSlides = [
  {
    title: "Connect with others\nover podcasts",
    description: "Discover, listen, and discuss podcasts together. Connect with curious minds and grow your community, one episode at a time.",
    image: require('../assets/images/onboard1.png'),
    shape: 'polygon', // Play button shape
  },
  {
    title: "3 Options. 1 Choice.\n0 Overwhelm.",
    description: "Endless scrolling? Decision fatigue? Not on our watch. Just three curated podcasts and you're off. (You're welcome.)",
    image: require('../assets/images/onboard2.png'),
    shape: 'rectangles', // 3 rectangles for pause icon
  },
  {
    title: "Expand your world",
    description: "Handpicked episodes you'd never pick yourself. We love you - but let's be real, you're kind of predictable.",
    image: require('../assets/images/onboard3.png'),
    shape: 'star', // Star shape
  },
  {
    title: "Accountability. But\nnot the boring kind",
    description: "You'll see who else is listening—and they'll see if you ghost. No pressure. (Okay... maybe just a little.)",
    image: require('../assets/images/onboard4.png'),
    shape: 'circle', // Circle shape
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const renderShape = (shapeType: string) => {
    switch (shapeType) {
      case 'polygon':
        // Play button triangle with rounded corners
        return (
          <View style={styles.shapeContainer}>
            <Svg width="80" height="92" viewBox="0 0 89 102" fill="none">
              <Path
                d="M9 90.8369L9 11.1631L78 51L9 90.8369Z"
                stroke="#E05F4E"
                strokeWidth="18"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
          </View>
        );
      case 'rectangles':
        // Pause icon with 3 rectangles from Rectangle 20.svg
        return (
          <View style={[styles.shapeContainer, styles.rectanglesShapeContainer]}>
            <View style={styles.rectanglesContainer}>
              <Svg width="20" height="80" viewBox="0 0 23 99" fill="none">
                <Rect width="23" height="99" rx="11.5" fill="#E29160"/>
              </Svg>
              <Svg width="20" height="80" viewBox="0 0 23 99" fill="none">
                <Rect width="23" height="99" rx="11.5" fill="#E05F4E"/>
              </Svg>
              <Svg width="20" height="80" viewBox="0 0 23 99" fill="none">
                <Rect width="23" height="99" rx="11.5" fill="#E05F4E"/>
              </Svg>
            </View>
          </View>
        );
      case 'star':
        // Star shape from Star 4.svg
        return (
          <View style={[styles.shapeContainer, styles.starShapeContainer]}>
            <Svg width="100" height="100" viewBox="0 0 134 144" fill="none">
              <Path d="M67 0L78.2696 44.5985L120.165 25.6027L92.3225 62.2203L133.295 83.1314L87.3071 84.1943L96.5041 129.266L67 93.9737L37.4959 129.266L46.693 84.1943L0.704903 83.1314L41.6775 62.2203L13.8355 25.6027L55.7304 44.5985L67 0Z" fill="#E05F4E"/>
            </Svg>
          </View>
        );
      case 'circle':
        // Circle shape from Ellipse 6.svg
        return (
          <View style={styles.shapeContainer}>
            <Svg width="85" height="85" viewBox="0 0 119 119" fill="none">
              <Circle cx="59.5" cy="59.5" r="49" stroke="#E05F4E" strokeWidth="21"/>
            </Svg>
          </View>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const checkUserRouting = async () => {
      if (!loading && user) {
        // Check if user has already chosen a podcast this week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const { data: choice } = await supabase
          .from('user_weekly_choices')
          .select('episode_id')
          .eq('user_id', user.id)
          .eq('week_start', weekStart.toISOString().split('T')[0])
          .single();

        if (choice) {
          // User has already chosen, go to home
          router.replace('/home');
        } else {
          // No choice yet, go to weekly selection
          router.replace('/home');
        }
      }
    };

    checkUserRouting();
  }, [user, loading]);

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentSlide(slideIndex);
  };

  const goToSlide = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: true });
    setCurrentSlide(index);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="#F4F1ED" barStyle="dark-content" />
        <View style={styles.progressContainer}>
        {onboardingSlides.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.progressBar,
              index === currentSlide && styles.progressBarActive,
            ]}
            onPress={() => goToSlide(index)}
          />
        ))}
      </View>

      <View style={styles.mainContent}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {onboardingSlides.map((slide, index) => (
            <View key={index} style={styles.slide}>
              {/* Header with brand name */}
              <View style={styles.header}>
                <Text style={styles.brandName}>POD{'\n'}CAST{'\n'}CLUB</Text>
              </View>
              {/* Image Container */}
              <View style={styles.imageContainer}>
                <View style={styles.imageWindow}>
                  <Image
                    source={slide.image}
                    style={styles.onboardingImage}
                    resizeMode="cover"
                  />
                  {renderShape(slide.shape)}
                </View>
              </View>

              <View style={styles.slideContent}>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideDescription}>{slide.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>Log in</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => router.push('/join')}
        >
          <Text style={styles.joinButtonText}>Join</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}