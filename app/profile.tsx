import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from './contexts/AuthContext';
import { useCurrentProfile, useUpdateProfile, useProfileInitials } from './hooks/queries/useProfile';
import { styles } from './profile.styles';
import { useRouter } from 'expo-router';
import { useCurrentTrackOnly } from './stores/audioStore.hooks';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const currentTrack = useCurrentTrackOnly();
  const { data: profile, isLoading: loading } = useCurrentProfile();
  const updateProfileMutation = useUpdateProfile();
  const initials = useProfileInitials();
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const fullName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile?.firstName || profile?.lastName || 'Your Profile';

  useEffect(() => {
    // Initialize form with profile data
    if (profile) {
      setUsername(profile.username || '');
      // Don't set avatarUri from profile - only set it when user picks a new image
    }
  }, [profile]);

  useEffect(() => {
    // Check if there are unsaved changes
    if (profile) {
      const changed =
        username !== (profile.username || '') ||
        avatarUri !== null;
      setHasChanges(changed);
    }
  }, [username, avatarUri, profile]);

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to set a profile picture.');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setHasChanges(true);
    }
  };

  const takePhoto = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your camera to take a profile picture.');
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setHasChanges(true);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Profile Picture',
      'Choose from where you want to select an image',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to update your profile');
      return;
    }

    setSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        username: username.trim() || null,
        avatarUrl: avatarUri || undefined,
      });

      Alert.alert('Success', 'Profile updated successfully!');
      setAvatarUri(null); // Clear the new avatar URI since it's been saved
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setUsername(profile?.username || '');
    setAvatarUri(null);
    setHasChanges(false);
  };

  if (loading || !fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayAvatar = avatarUri || profile?.avatarUrl;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontFamily: 'PaytoneOne_400Regular' }]}>
          {fullName}
        </Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color="#403837" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            currentTrack && { paddingBottom: 120 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={showImageOptions} style={styles.editPhotoButton}>
              <Text style={styles.editPhotoText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your display name"
                placeholderTextColor="#8B8680"
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>
                How people will see you if they don't have you as a contact
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>
                  {user?.phone || 'Not available'}
                </Text>
              </View>
            </View>
          </View>

          {/* Buttons */}
          {hasChanges && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}