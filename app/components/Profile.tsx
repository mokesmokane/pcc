import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentProfile, useUpdateProfile, useProfileInitials } from '../hooks/queries/useProfile';
import { useCurrentTrack } from '../stores/audioStore.hooks';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { data: profile, isLoading: loading } = useCurrentProfile();
  const updateProfileMutation = useUpdateProfile();
  const initials = useProfileInitials();
  const { currentTrack } = useCurrentTrack();
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null); 
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  if (loading) {
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
            <TouchableOpacity onPress={showImageOptions} style={styles.avatarButton}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Tap to change photo</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor="#8B8680"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.emailGroup}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.emailText}>{user?.email || 'Not available'}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B8680',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarButton: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E05F4E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#403837',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F4F1ED',
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8B8680',
  },
  formSection: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#403837',
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  emailGroup: {
    gap: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#8B8680',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#403837',
  },
  saveButton: {
    backgroundColor: '#E05F4E',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});