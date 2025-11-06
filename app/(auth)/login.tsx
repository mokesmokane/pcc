import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import type { CountryCode } from '../components/CountryCodeSelector';
import CountryCodeSelector, { COUNTRY_CODES } from '../components/CountryCodeSelector';
import { useAuth } from '../contexts/AuthContext';
import { getPhoneNumberError, normalizePhoneNumber } from '../utils/phoneNumber';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithPhone } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    COUNTRY_CODES[0] // UK is first in the list
  );

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    const error = getPhoneNumberError(value, selectedCountry);
    setPhoneError(error);
  };

  const isFormValid = phoneNumber.length > 0 && !phoneError;

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    try {
      const validation = normalizePhoneNumber(phoneNumber, selectedCountry);

      if (!validation.isValid) {
        Alert.alert(
          'Invalid Phone Number',
          validation.error || 'Please enter a valid phone number.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      const formattedPhone = validation.normalizedNumber ?? '';
      await signInWithPhone(formattedPhone);
      router.push(`/verify-phone?phone=${encodeURIComponent(formattedPhone)}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to send verification code. Please try again.';
      Alert.alert(
        'Sign In Error',
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <Text style={styles.title}>Welcome back</Text>

              <View style={styles.formContainer}>
                <View>
                  <View style={styles.phoneInputContainer}>
                    <CountryCodeSelector
                      selectedCountry={selectedCountry}
                      onSelectCountry={(country) => {
                        setSelectedCountry(country);
                        if (phoneNumber) {
                          const error = getPhoneNumberError(phoneNumber, country);
                          setPhoneError(error);
                        }
                      }}
                    />
                    <TextInput
                      value={phoneNumber}
                      onChangeText={handlePhoneChange}
                      style={[styles.phoneInput, phoneError ? styles.inputError : {}]}
                      placeholder="Phone number"
                      placeholderTextColor="#8B8680"
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      selectionColor="#E05F4E"
                    />
                  </View>
                  {phoneError && (
                    <Text style={styles.errorText}>{phoneError}</Text>
                  )}
                </View>
              </View>

              <View style={styles.spacer} />

              <View style={styles.bottomSection}>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!isFormValid || isLoading}
                  style={[
                    styles.submitButton,
                    (!isFormValid || isLoading) ? styles.submitButtonDisabled : styles.submitButtonActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitButtonText}>
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(auth)/join')}
                  style={styles.signupLink}
                >
                  <Text style={styles.signupLinkText}>
                    Don&apos;t have an account? Join the club
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 36,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
    marginBottom: 48,
    marginTop: 60,
  },
  formContainer: {
    gap: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#403837',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    height: 56,
    backgroundColor: 'transparent',
    color: '#403837',
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    gap: 24,
    paddingBottom: 32,
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0CFC5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonActive: {
    backgroundColor: '#E05F4E',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitButtonDisabled: {
    backgroundColor: '#F0CFC5',
  },
  signupLink: {
    alignItems: 'center',
  },
  signupLinkText: {
    fontSize: 14,
    color: '#403837',
    textDecorationLine: 'underline',
  },
  inputError: {
    borderColor: '#E05F4E',
  },
  errorText: {
    color: '#E05F4E',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
});