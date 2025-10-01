import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PlaybackSpeedModalProps {
  visible: boolean;
  currentRate: number;
  onClose: () => void;
  onSelectRate: (rate: number) => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export function PlaybackSpeedModal({
  visible,
  currentRate,
  onClose,
  onSelectRate
}: PlaybackSpeedModalProps) {
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
          <Text style={styles.title}>Playback Speed</Text>
          {PLAYBACK_RATES.map((rate) => (
            <TouchableOpacity
              key={rate}
              style={[
                styles.option,
                currentRate === rate && styles.optionActive,
              ]}
              onPress={() => {
                onSelectRate(rate);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  currentRate === rate && styles.optionTextActive,
                ]}
              >
                {rate}x
              </Text>
            </TouchableOpacity>
          ))}
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