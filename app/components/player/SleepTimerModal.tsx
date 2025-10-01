import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SleepTimerModalProps {
  visible: boolean;
  currentTimer: number | null;
  onClose: () => void;
  onSelectTimer: (minutes: number | null) => void;
}

const TIMER_OPTIONS = [5, 10, 15, 30, 45, 60, 90];

export function SleepTimerModal({
  visible,
  currentTimer,
  onClose,
  onSelectTimer
}: SleepTimerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Sleep Timer</Text>
          {TIMER_OPTIONS.map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.option,
                currentTimer === minutes && styles.optionActive,
              ]}
              onPress={() => {
                onSelectTimer(minutes);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  currentTimer === minutes && styles.optionTextActive,
                ]}
              >
                {minutes} minutes
              </Text>
            </TouchableOpacity>
          ))}
          {currentTimer && (
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onSelectTimer(null);
                onClose();
              }}
            >
              <Text style={[styles.optionText, { color: '#ef4444' }]}>
                Cancel Timer
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 320,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  optionActive: {
    backgroundColor: '#f3f4f6',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  optionTextActive: {
    fontWeight: '600',
    color: '#111827',
  },
});