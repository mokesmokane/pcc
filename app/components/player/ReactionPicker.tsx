import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';

interface ReactionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectReaction: (emoji: string) => void;
  position?: { x: number; y: number };
}

const REACTIONS = ['❤️', '😂', '👏', '🔥', '💯', '👀', '🙌', '😮', '🎉', '💪', '🤔', '😍'];

export function ReactionPicker({
  visible,
  onClose,
  onSelectReaction,
  position = { x: 0, y: 0 },
}: ReactionPickerProps) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const handleSelectReaction = (emoji: string) => {
    onSelectReaction(emoji);
    onClose();
  };

  if (!visible) return null;

  // Calculate position to keep picker within screen bounds
  const screenWidth = Dimensions.get('window').width;
  const pickerWidth = Math.min(screenWidth - 32, 320); // Max width 320 or screen width - padding
  const leftPosition = Math.min(
    Math.max(16, position.x - pickerWidth / 2),
    screenWidth - pickerWidth - 16
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.picker,
            {
              left: leftPosition,
              top: position.y - 80,
              width: pickerWidth,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.reactionContainer}>
              {REACTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionButton}
                  onPress={() => handleSelectReaction(emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  picker: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 60,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  reactionContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  reactionButton: {
    paddingHorizontal: 4,
  },
  reactionEmoji: {
    fontSize: 24,
  },
});