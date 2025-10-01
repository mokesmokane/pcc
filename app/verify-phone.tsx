import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from './contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { styles } from './verify-phone.styles';

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { phone, isSignUp } = useLocalSearchParams();
  const { verifyOTP, updateProfileWithNames } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newCode.every(digit => digit) && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');
    if (codeToVerify.length !== 6) return;

    setIsLoading(true);
    try {
      const { user } = await verifyOTP(phone as string, codeToVerify);

      if (isSignUp === 'true') {
        // For new sign-ups, update profile with names
        const pendingData = await AsyncStorage.getItem('pendingUserData');
        if (pendingData && user) {
          const { firstName, lastName } = JSON.parse(pendingData);
          try {
            await updateProfileWithNames(user.id, firstName, lastName);
            await AsyncStorage.removeItem('pendingUserData');
            console.log('Profile updated with user names');
          } catch (profileError) {
            console.error('Failed to update profile with names:', profileError);
            // Continue even if profile update fails
          }
        }

        // Show success screen
        console.log('New sign up detected, navigating to success screen');
        // Small delay to ensure auth state has settled
        setTimeout(() => {
          router.replace('/success');
        }, 100);
      } else {
        // For existing users, go to home
        console.log('Existing user detected, navigating to home');
        router.replace('/home');
      }
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.message || 'Invalid code. Please try again.',
        [{ text: 'OK' }]
      );
      // Clear the code
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verify your phone</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to {phone}
          </Text>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputs.current[index] = ref}
                style={styles.codeInput}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                selectionColor="#E05F4E"
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={() => handleVerify()}
            disabled={code.join('').length !== 6 || isLoading}
            style={[
              styles.verifyButton,
              (code.join('').length !== 6 || isLoading) && styles.verifyButtonDisabled
            ]}
          >
            <Text style={styles.verifyButtonText}>
              {isLoading ? 'Verifying...' : 'Verify'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
