import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { Checkbox } from './components/ui/checkbox';
import { styles } from './styles/onboarding-struggles.styles';

const STRUGGLES = [
  { id: 'choosing', label: 'I spend more time choosing than listening' },
  { id: 'explore', label: 'I want to explore beyond my usual topics' },
  { id: 'discuss', label: 'I wish I could discuss episodes with others' },
  { id: 'time', label: 'I struggle to find time to listen' },
  { id: 'finish', label: 'I often start but don\'t finish' },
  { id: 'other', label: 'Other' },
];

export default function OnboardingStrugglesScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ PaytoneOne_400Regular });
  const [selected, setSelected] = useState<string[]>([]);

  const isValid = selected.length > 0;

  const toggleOption = (id: string) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleNext = () => {
    if (!isValid) return;

    // Pass struggles to next screen via params
    router.push({
      pathname: '/onboarding-interests',
      params: { struggles: JSON.stringify(selected) },
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What&apos;s your{'\n'}podcast struggle?</Text>
        <Text style={styles.subtitle}>Pick all that fit you</Text>

        <View style={styles.card}>
          {STRUGGLES.map((struggle, index) => {
            const isSelected = selected.includes(struggle.id);
            const isLast = index === STRUGGLES.length - 1;
            return (
              <React.Fragment key={struggle.id}>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => toggleOption(struggle.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionLabel}>{struggle.label}</Text>
                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      checked={isSelected}
                      onValueChange={() => toggleOption(struggle.id)}
                    />
                  </View>
                </TouchableOpacity>
                {!isLast && <View style={styles.separator} />}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            isValid ? styles.nextButtonEnabled : styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!isValid}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
