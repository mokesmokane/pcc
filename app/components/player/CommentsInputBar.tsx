import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentProfile, useProfileInitials } from '../../hooks/queries/useProfile';

interface CommentsInputBarProps {
  onSubmit: (text: string) => Promise<void>;
  placeholder?: string;
  onInputPress?: () => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  includeBottomPadding?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
}

export function CommentsInputBar({
  onSubmit,
  placeholder = 'Join the discussion...',
  onInputPress,
  readOnly = false,
  autoFocus = false,
  includeBottomPadding = false,
  value,
  onChangeText,
}: CommentsInputBarProps) {
  const { data: profile } = useCurrentProfile();
  const initials = useProfileInitials();
  const [internalValue, setInternalValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // Use controlled value if provided, otherwise use internal state
  const commentText = value !== undefined ? value : internalValue;
  const setCommentText = onChangeText || setInternalValue;

  useEffect(() => {
    if (autoFocus && inputRef.current && !readOnly) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [autoFocus, readOnly]);

  // Track keyboard visibility
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });

    const hideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const handleSubmit = async () => {
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(commentText.trim());
      // Clear the value - works for both controlled and uncontrolled
      if (onChangeText) {
        onChangeText('');
      } else {
        setInternalValue('');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Smart bottom padding:
  // - No extra padding when keyboard is visible (keyboard covers the nav bar)
  // - Apply safe area padding when at screen bottom and no keyboard
  // - Minimal padding otherwise
  const bottomPadding = includeBottomPadding && !keyboardVisible
    ? Math.max(insets.bottom, 12)
    : 12;

  return (
    <View style={[
      styles.container,
      { paddingBottom: bottomPadding }
    ]}>
      <View style={styles.inputWrapper}>
        {profile?.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {initials}
            </Text>
          </View>
        )}

        {readOnly ? (
          <TouchableOpacity
            style={styles.textInput}
            onPress={onInputPress}
            activeOpacity={0.7}
          >
            <Text style={styles.placeholderText}>{placeholder}</Text>
          </TouchableOpacity>
        ) : (
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor="#8B8680"
            value={commentText}
            onChangeText={setCommentText}
            onSubmitEditing={handleSubmit}
            multiline
            maxLength={500}
            editable={!isSubmitting}
            returnKeyType="send"
            autoFocus={autoFocus}
          />
        )}

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!commentText.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EDE9',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F8F6F3',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#403837',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E05F4E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#DDD9D5',
  },
  placeholderText: {
    fontSize: 14,
    color: '#8B8680',
    lineHeight: 20,
  },
});