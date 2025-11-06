import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface CreateTestUserModalProps {
  visible: boolean;
  onClose: () => void;
  contactName: string;
  contactPhone: string;
  onCreateUser: (userData: {
    phone: string;
    firstName: string;
    lastName: string;
    avatarUri?: string;
  }) => Promise<void>;
}

export function CreateTestUserModal({
  visible,
  onClose,
  contactName,
  contactPhone,
  onCreateUser,
}: CreateTestUserModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  // Auto-populate name when modal opens
  React.useEffect(() => {
    if (visible && contactName) {
      const nameParts = contactName.trim().split(/\s+/); // Split on any whitespace
      if (nameParts.length === 1) {
        // Single name - use as first name
        setFirstName(nameParts[0] || '');
        setLastName('');
      } else if (nameParts.length === 2) {
        // Two parts - first and last
        setFirstName(nameParts[0] || '');
        setLastName(nameParts[1] || '');
      } else {
        // Three or more parts - first name is first part, last name is everything else
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
      }
    }
  }, [visible, contactName]);

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access to upload a profile picture');
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
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = () => {
    setAvatarUri(undefined);
  };

  const handleCreate = async () => {
    if (!firstName.trim()) {
      Alert.alert('Missing Information', 'Please enter at least a first name');
      return;
    }

    setLoading(true);
    try {
      await onCreateUser({
        phone: contactPhone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        avatarUri,
      });

      // Reset form and close
      setFirstName('');
      setLastName('');
      setAvatarUri(undefined);
      onClose();
    } catch (error: any) {
      console.error('Error creating test user:', error);
      Alert.alert('Error', error.message || 'Failed to create test user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFirstName('');
      setLastName('');
      setAvatarUri(undefined);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} disabled={loading}>
            <Ionicons name="close" size={28} color="#403837" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Test User</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Phone Number (read-only) */}
          <View style={styles.section}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneContainer}>
              <Ionicons name="call" size={20} color="#8B8680" style={styles.phoneIcon} />
              <Text style={styles.phoneText}>{contactPhone}</Text>
            </View>
          </View>

          {/* Profile Picture */}
          <View style={styles.section}>
            <Text style={styles.label}>Profile Picture (Optional)</Text>
            {avatarUri ? (
              <View style={styles.avatarContainer}>
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                  disabled={loading}
                >
                  <Ionicons name="close-circle" size={24} color="#E05F4E" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickImage}
                disabled={loading}
              >
                <Ionicons name="camera" size={32} color="#8B8680" />
                <Text style={styles.uploadButtonText}>Upload Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* First Name */}
          <View style={styles.section}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor="#C4BFB9"
              editable={!loading}
              autoCapitalize="words"
            />
          </View>

          {/* Last Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name (optional)"
              placeholderTextColor="#C4BFB9"
              editable={!loading}
              autoCapitalize="words"
            />
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Test User</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            This will create a test user account with phone authentication enabled.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#403837',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  phoneIcon: {
    marginRight: 12,
  },
  phoneText: {
    fontSize: 16,
    color: '#403837',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#403837',
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  uploadButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8E5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#8B8680',
    marginTop: 8,
  },
  avatarContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F6F3',
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: '50%',
    marginRight: -70,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  createButton: {
    backgroundColor: '#E05F4E',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 13,
    color: '#8B8680',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
