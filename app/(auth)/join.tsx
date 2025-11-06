import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CountryCode } from '../components/CountryCodeSelector';
import CountryCodeSelector, { COUNTRY_CODES } from '../components/CountryCodeSelector';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth } from '../contexts/AuthContext';
import { getPhoneNumberError, normalizePhoneNumber } from '../utils/phoneNumber';

export default function JoinScreen() {
  const router = useRouter();
  const { signInWithPhone } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    agreeToTerms: false,
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    COUNTRY_CODES[0] // UK is first in the list
  );

  if (!fontsLoaded) {
    return null;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (field === 'phoneNumber') {
      const error = getPhoneNumberError(value, selectedCountry);
      setPhoneError(error);
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      agreeToTerms: checked,
    }));
  };

  const isFormValid =
    formData.firstName &&
    formData.lastName &&
    formData.phoneNumber.length > 0 &&
    !phoneError &&
    formData.agreeToTerms;

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    try {
      const validation = normalizePhoneNumber(formData.phoneNumber, selectedCountry);

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

      // Store user data temporarily for profile creation after verification
      await AsyncStorage.setItem('pendingUserData', JSON.stringify({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formattedPhone
      }));

      await signInWithPhone(formattedPhone);
      router.push(`/verify-phone?phone=${encodeURIComponent(formattedPhone)}&isSignUp=true`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign up. Please try again.';
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Join the club</Text>

            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={formData.firstName}
                  onChangeText={(text) => handleInputChange('firstName', text)}
                  style={styles.input}
                  placeholder="First name"
                  placeholderTextColor="#8B8680"
                  selectionColor="#E05F4E"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  value={formData.lastName}
                  onChangeText={(text) => handleInputChange('lastName', text)}
                  style={styles.input}
                  placeholder="Last name"
                  placeholderTextColor="#8B8680"
                  selectionColor="#E05F4E"
                  autoCapitalize="words"
                />
              </View>

              <View>
                <View style={styles.phoneInputContainer}>
                  <CountryCodeSelector
                    selectedCountry={selectedCountry}
                    onSelectCountry={(country) => {
                      setSelectedCountry(country);
                      if (formData.phoneNumber) {
                        const error = getPhoneNumberError(formData.phoneNumber, country);
                        setPhoneError(error);
                      }
                    }}
                  />
                  <TextInput
                    value={formData.phoneNumber}
                    onChangeText={(text) => handleInputChange('phoneNumber', text)}
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
              <View style={styles.checkboxContainer}>
                <Checkbox
                  checked={formData.agreeToTerms}
                  onValueChange={handleCheckboxChange}
                />
                <Text style={styles.checkboxLabel}>
                  I agree to be a delightful human, communicating with consideration and respect.
                </Text>
              </View>

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
                  {isLoading ? 'Creating account...' : 'Join the club'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  },
  formContainer: {
    gap: 16,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  input: {
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#403837',
    marginTop: 0,
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