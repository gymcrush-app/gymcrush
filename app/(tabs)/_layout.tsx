import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { UserProfileModalProvider } from '@/lib/contexts/UserProfileModalContext';
import { Tabs } from 'expo-router';
import { Compass, Heart, MessageCircle, User } from 'lucide-react-native';
import { colors } from '@/theme';

export default function TabLayout() {
  return (
    <UserProfileModalProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 1,
          },
        }}
      >
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: 'Matches',
            tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
      <UserProfileModal />
    </UserProfileModalProvider>
  );
}
