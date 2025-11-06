import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TraditionalLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E05F4E',
        tabBarInactiveTintColor: '#8B8680',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0EDE9',
          borderTopWidth: 1,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="podcasts"
        options={{
          title: 'Podcasts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="upnext"
        options={{
          title: 'Up Next',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="downloaded"
        options={{
          title: 'Downloaded',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="download-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}