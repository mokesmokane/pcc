import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CommentInputProps {
  userAvatar?: string;
  userName?: string;
  onPress: () => void;
}

export function CommentInput({ userAvatar, userName = 'ME', onPress }: CommentInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        {userAvatar ? (
          <Image source={{ uri: userAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{userName.substring(0, 2).toUpperCase()}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.input} onPress={onPress}>
          <Text style={styles.placeholder}>Join the discussion...</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sendButton} onPress={onPress}>
          <View style={styles.sendButtonCircle}>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EDE9',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8E5E1',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E05F4E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8F6F3',
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 14,
    color: '#8B8680',
  },
  sendButton: {
    padding: 2,
  },
  sendButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E05F4E',
    justifyContent: 'center',
    alignItems: 'center',
  },
});