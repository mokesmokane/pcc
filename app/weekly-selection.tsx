import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { useWeeklySelections } from './contexts/WeeklySelectionsContext';
import { CARD_WIDTH, styles } from './weekly-selection.styles';
import type { WeeklyPodcast } from './contexts/WeeklySelectionsContext';

const { width: _screenWidth } = Dimensions.get('window');

// Embedded spinner wheel component
const SpinnerWheel = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const rotationValue = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  const wheelPodcasts = [
    "The Joe Rogan",
    "Serial",
    "This American...",
    "Radiolab",
    "Planet Money",
    "Stuff You Sh...",
    "The Daily",
    "Conan O'Brie...",
    "My Favorite",
    "The Tim Ferr...",
    "Fresh Air",
    "Reply All",
    "Criminal",
    "99% Invisibl...",
    "WTF with Mar...",
    "The Moth",
    "Science Vs",
    "Hardcore His...",
    "Song Explod...",
    "Hidden Brain",
  ];

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setHighlightedIndex(null);

    // Generate random rotation
    const spins = 8 + Math.random() * 4;
    const finalRotation = spins * 360 + Math.random() * 360;

    // Animate the wheel
    Animated.timing(rotationValue, {
      toValue: currentRotation.current + finalRotation,
      duration: 5000,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: true,
    }).start(() => {
      currentRotation.current += finalRotation;
      setIsSpinning(false);

      // Calculate which segment is at the top
      const totalRotation = currentRotation.current % 360;
      const normalizedRotation = (360 - (totalRotation % 360) + 360) % 360;
      const segmentSize = 360 / wheelPodcasts.length;
      const segmentAtTop = Math.floor(normalizedRotation / segmentSize) % wheelPodcasts.length;

      // Highlight the selected segment
      setHighlightedIndex(segmentAtTop);
    });
  };

  const AnimatedSvg = Animated.createAnimatedComponent(Svg);
  const segmentAngle = 360 / wheelPodcasts.length;

  return (
    <TouchableOpacity onPress={handleSpin} style={{ width: 240, height: 240, position: 'relative' }}>
      {/* Pointer at top pointing down */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 114,
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 12,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#403837',
        zIndex: 10,
      }} />

      <AnimatedSvg
        width={240}
        height={240}
        viewBox="0 0 320 320"
        style={{
          transform: [{
            rotate: rotationValue.interpolate({
              inputRange: [0, 360],
              outputRange: ['0deg', '360deg'],
            })
          }]
        }}
      >
        {wheelPodcasts.map((podcast, index) => {
          const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
          const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);
          const midAngle = (startAngle + endAngle) / 2;

          const radius = 160;
          const centerX = 160;
          const centerY = 160;

          const x1 = centerX + Math.cos(startAngle) * radius;
          const y1 = centerY + Math.sin(startAngle) * radius;
          const x2 = centerX + Math.cos(endAngle) * radius;
          const y2 = centerY + Math.sin(endAngle) * radius;

          const largeArcFlag = segmentAngle > 180 ? 1 : 0;

          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            "Z",
          ].join(" ");

          const textRadius = radius * 0.7;
          const textX = centerX + Math.cos(midAngle) * textRadius;
          const textY = centerY + Math.sin(midAngle) * textRadius;
          const textAngle = (midAngle * 180) / Math.PI;

          return (
            <G key={index}>
              <Path
                d={pathData}
                fill={index === highlightedIndex ? "#E05F4E" : index % 2 === 0 ? "#e5e7eb" : "#9ca3af"}
                stroke="#ffffff"
                strokeWidth="1"
              />
              <SvgText
                x={textX}
                y={textY}
                fill="black"
                fontSize="10"
                fontWeight="500"
                textAnchor="middle"
                alignmentBaseline="middle"
                transform={`rotate(${textAngle > 90 && textAngle < 270 ? textAngle + 180 : textAngle}, ${textX}, ${textY})`}
              >
                {podcast}
              </SvgText>
            </G>
          );
        })}
        <Circle cx="160" cy="160" r="40" fill="#403837" />
        <SvgText
          x="160"
          y="165"
          fill="white"
          fontSize="20"
          fontWeight="bold"
          textAnchor="middle"
        >
          Spin
        </SvgText>
      </AnimatedSvg>
    </TouchableOpacity>
  );
};

// Star burst SVG component
const StarBurst = ({ style }: { style?: object }) => (
  <Svg width="80" height="80" viewBox="0 0 134 144" fill="none" style={style}>
    <Path
      d="M67 0L78.2696 44.5985L120.165 25.6027L92.3225 62.2203L133.295 83.1314L87.3071 84.1943L96.5041 129.266L67 93.9737L37.4959 129.266L46.693 84.1943L0.704903 83.1314L41.6775 62.2203L13.8355 25.6027L55.7304 44.5985L67 0Z"
      fill="#E29160"
    />
  </Svg>
);

export default function WeeklySelectionScreen() {
  const router = useRouter();

  const {
    selections,
    userChoice
  } = useWeeklySelections();

  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  

  // Add spinner card to selections
  const podcastDataWithSpinner = useMemo(() => {
    const dataWithSpinner = [...selections.values()];

    // Always add the spinner as the 4th card
    dataWithSpinner.push({
      id: 'spinner',
      category: 'spinner',
      categoryLabel: 'Wild card',
      title: 'None of these floating your boat?',
      source: 'Spin the wheel to reveal your 4th option',
      clubMembers: 0,
      progress: 0,
      duration: '',
      episode: '',
      image: undefined,
      audioUrl: '',
      description: 'Let fate decide your next listen!',
    });

    return dataWithSpinner;
  }, [selections]);


  const handlePodcastPress = async (podcast: WeeklyPodcast) => {
    if (podcast.category === 'spinner') {
      // For now, just spin the wheel in place
      // Later this can navigate to a separate screen
      return;
    } else if (userChoice?.id === podcast.id) {
      // If this is the selected podcast, go to home/player
      router.push('/home');
    } else {
      // Navigate to podcast details with all the podcast data
      router.push({
        pathname: '/podcast-details',
        params: {
          id: podcast.id,
          title: podcast.title,
          source: podcast.source,
          clubMembers: podcast.clubMembers.toString(),
          category: podcast.categoryLabel || podcast.category,
          image: podcast.image || '',
          audioUrl: podcast.audioUrl || '',
          description: podcast.description || ''
        }
      });
    }
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CARD_WIDTH);
    setCurrentIndex(index);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>This weeks chosen podcasts</Text>
            <Text style={styles.subtitle}>
              Three curated options so you don&apos;t spend ages choosing.
            </Text>
          </View>
        </View>

        <View style={styles.scrollContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + 16}
            snapToAlignment="start"
          >
            <View style={styles.cardsWrapper}>
              {podcastDataWithSpinner.map((podcast, index) => (
                <View key={podcast.id} style={styles.card}>
                  <View style={styles.cardContent}>
                    {podcast.category === 'spinner' ? (
                      // Special layout for spinner card
                      <>
                        <View>
                          <View style={styles.spinnerCategoryPill}>
                            <Text style={styles.spinnerCategoryText}>Wild card</Text>
                          </View>
                          <Text style={[styles.podcastTitle, styles.spinnerTitle]}>{podcast.source}</Text>
                          <Text style={styles.spinnerSubtitle}>{podcast.title}</Text>
                        </View>
                        <View style={styles.spinnerContainer}>
                          <SpinnerWheel />
                        </View>
                      </>
                    ) : (
                      // Regular podcast card layout
                      <>
                        <View>
                          <View style={styles.cardHeader}>
                            <View style={styles.imageContainer}>
                              {podcast.image ? (
                                <Image source={{ uri: podcast.image }} style={styles.podcastImage} />
                              ) : (
                                <View style={styles.placeholderImage}>
                                  <Text style={styles.placeholderText}>
                                    {podcast.source.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              {index === 0 && (
                                <StarBurst style={styles.starBurst} />
                              )}
                            </View>
                            <Text style={styles.categoryLabel}>{podcast.categoryLabel}</Text>
                          </View>

                          <Text style={styles.podcastTitle}>{podcast.title}</Text>
                          <Text style={styles.podcastSource}>{podcast.source}</Text>

                          <View style={styles.metaContainer}>
                            <View style={styles.membersContainer}>
                              <Text style={styles.fireEmoji}>🔥</Text>
                              <Text style={styles.membersText}>
                                {podcast.clubMembers} people in the club
                              </Text>
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handlePodcastPress(podcast)}
                          activeOpacity={0.9}
                          style={[
                            styles.tellMeMoreButton,
                            userChoice?.id === podcast.id && styles.listenButton
                          ]}
                        >
                          <Text style={[
                            styles.tellMeMoreText,
                            userChoice?.id === podcast.id && styles.listenButtonText
                          ]}>
                            {userChoice?.id === podcast.id ? 'Listen' : 'Tell me more'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.pagination}>
          {podcastDataWithSpinner.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}