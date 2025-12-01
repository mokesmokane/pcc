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
import { useRouter, Stack } from 'expo-router';
import { useCurrentTrackOnly } from './stores/audioStore.hooks';

// Interest data mapping (id -> { label, emoji })
const INTEREST_DATA: Record<string, { label: string; emoji: string }> = {
  'health': { label: 'Health', emoji: '🏃' },
  'politics': { label: 'Politics', emoji: '🗳️' },
  'comedy': { label: 'Comedy', emoji: '😂' },
  'entrepreneurship': { label: 'Entrepreneurship', emoji: '🚀' },
  'technology': { label: 'Technology', emoji: '📱' },
  'science': { label: 'Science', emoji: '🔬' },
  'history': { label: 'History', emoji: '📜' },
  'culture': { label: 'Culture', emoji: '🌍' },
  'music': { label: 'Music', emoji: '🎵' },
  'relationships': { label: 'Relationships', emoji: '❤️' },
  'philosophy': { label: 'Philosophy', emoji: '🤔' },
  'personal-development': { label: 'Personal Development', emoji: '🌱' },
  'art-design': { label: 'Art & Design', emoji: '🎨' },
};

const getInterestData = (id: string) => {
  return INTEREST_DATA[id] || { label: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), emoji: '🎧' };
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const currentTrack = useCurrentTrackOnly();
  const { data: profile, isLoading: loading } = useCurrentProfile();
  const updateProfileMutation = useUpdateProfile();
  const initials = useProfileInitials();
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fullName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile?.firstName || profile?.lastName || 'Your Name';

  const location = profile?.location || 'Location not set';
  const bio = profile?.bio || '';
  const interests = profile?.interestsArray || [];

  useEffect(() => {
    if (profile) {
      setEditedBio(profile.bio || '');
    }
  }, [profile]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      // Auto-save avatar
      handleSaveAvatar(result.assets[0].uri);
    }
  };

  const handleSaveAvatar = async (uri: string) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateProfileMutation.mutateAsync({ avatarUrl: uri });
      setAvatarUri(null);
    } catch (error) {
      console.error('Error saving avatar:', error);
      Alert.alert('Error', 'Failed to update profile picture.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBio = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateProfileMutation.mutateAsync({ bio: editedBio });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving bio:', error);
      Alert.alert('Error', 'Failed to update bio.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Generate DiceBear avatar URL using user ID as seed (consistent across app)
  const diceBearSeed = encodeURIComponent(user?.id || 'user');
  const diceBearUrl = `https://api.dicebear.com/7.x/avataaars/png?seed=${diceBearSeed}&backgroundColor=f4f1ed`;

  const displayAvatar = avatarUri || profile?.avatarUrl || diceBearUrl;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Coral Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerNav}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Avatar (overlaps header - outside ScrollView) */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          currentTrack && { paddingBottom: 120 }
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* Content */}
        <View style={styles.contentSection}>
          {/* Name */}
          <Text style={styles.nameText}>{fullName}</Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#8B8680" />
            <Text style={styles.locationText}>{location}</Text>
          </View>

          {/* Bio */}
          <Text style={styles.sectionLabel}>Bio</Text>
          {isEditing ? (
            <>
              <TextInput
                style={styles.bioInput}
                value={editedBio}
                onChangeText={setEditedBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#8B8680"
                multiline
                autoFocus
              />
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setEditedBio(bio);
                    setIsEditing(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSaveBio}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={bio ? styles.bioText : styles.bioPlaceholder}>
                {bio || 'Tell us a bit about yourself'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Interests</Text>
              <View style={styles.interestsContainer}>
                {interests.map((interest, index) => {
                  const data = getInterestData(interest);
                  return (
                    <View key={index} style={styles.interestChip}>
                      <Text style={styles.interestEmoji}>{data.emoji}</Text>
                      <Text style={styles.interestText}>{data.label}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
