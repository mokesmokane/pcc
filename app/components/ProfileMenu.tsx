import { Ionicons } from '@expo/vector-icons';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from 'react-native';

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
}

const MENU_WIDTH = Dimensions.get('window').width * 0.85;

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  iconColor?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'details', icon: 'person-outline', label: 'Your details' },
  { id: 'traditional', icon: 'play-circle-outline', label: 'Traditional Player' },
  { id: 'notifications', icon: 'notifications-outline', label: 'Notifications' },
  { id: 'splash', icon: 'color-palette-outline', label: 'View Splash Screen', iconColor: '#E05F4E' },
  { id: 'admin', icon: 'shield-checkmark-outline', label: 'Admin', iconColor: '#E05F4E' },
  { id: 'about', icon: 'heart-outline', label: 'About Podcast Club', iconColor: '#E05F4E' },
  { id: 'faq', icon: 'help-circle-outline', label: "FAQ's" },
  { id: 'contact', icon: 'mail-outline', label: 'Contact us' },
];

export function ProfileMenu({ visible, onClose, userName }: ProfileMenuProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const router = useRouter();
  const { signOut } = useAuth();

  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(MENU_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              onClose(); // Close the menu first
              await signOut();
              router.replace('/(auth)/onboarding');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          }
        },
      ],
    );
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50 || gestureState.vx > 0.5) {
          onClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: MENU_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible && slideAnim._value === MENU_WIDTH) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Menu */}
        <Animated.View
          style={[
            styles.menu,
            {
              transform: [{ translateX: slideAnim }],
              paddingTop: insets.top,
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.greeting, { fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined }]}>
              Hi {userName}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#403837" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => {
                  if (item.id === 'details') {
                    onClose();
                    router.push('/profile');
                  } else if (item.id === 'traditional') {
                    onClose();
                    router.push('/(traditional)/podcasts');
                  } else if (item.id === 'splash') {
                    onClose();
                    router.push('/splash-preview');
                  } else if (item.id === 'admin') {
                    onClose();
                    router.push('/admin');
                  }
                  // Handle other menu items here
                }}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={item.iconColor || '#8B8680'}
                  />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C4C1BB" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer Links */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Terms & Conditions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLink} onPress={handleLogout}>
              <Text style={styles.footerLinkLogout}>Log out</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: '#F8F6F3',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 28,
    color: '#E05F4E',
  },
  closeButton: {
    padding: 4,
  },
  menuItems: {
    flex: 1,
    paddingHorizontal: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#403837',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E5E1',
  },
  footerLink: {
    paddingVertical: 8,
  },
  footerLinkText: {
    fontSize: 14,
    color: '#8B8680',
  },
  footerLinkLogout: {
    fontSize: 14,
    color: '#403837',
    fontWeight: '600',
    marginTop: 8,
  },
});