import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabName = 'home' | 'attend' | 'history' | 'profile';

interface TabConfig {
  name: TabName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const tabs: TabConfig[] = [
  {
    name: 'home',
    label: 'Home',
    icon: 'home-outline',
    activeIcon: 'home',
    route: '/home',
  },
  {
    name: 'attend',
    label: 'Attend',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
    route: '/attend',
  },
  {
    name: 'history',
    label: 'History',
    icon: 'time-outline',
    activeIcon: 'time',
    route: '/history',
  },
  {
    name: 'profile',
    label: 'Profile',
    icon: 'person-outline',
    activeIcon: 'person',
    route: '/profile',
  },
];

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const handleTabPress = (route: string) => {
    router.push(route);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.route;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => handleTabPress(tab.route)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={24}
                color={isActive ? '#E05F4E' : '#8B8680'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    color: '#8B8680',
  },
  activeTabLabel: {
    color: '#E05F4E',
    fontWeight: '600',
  },
});