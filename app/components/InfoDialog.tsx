import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { Ionicons } from '@expo/vector-icons';

interface InfoDialogProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  type?: 'info' | 'success' | 'error';
  onClose: () => void;
}

export function InfoDialog({
  visible,
  title,
  message,
  buttonText = 'OK',
  type = 'info',
  onClose,
}: InfoDialogProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const iconName = type === 'success' ? 'checkmark-circle' : type === 'error' ? 'alert-circle' : 'information-circle';
  const iconColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#E05F4E' : '#E05F4E';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={48} color={iconColor} />
          </View>
          <Text style={[styles.title, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '400',
    color: '#403837',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#8B8680',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#E05F4E',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
