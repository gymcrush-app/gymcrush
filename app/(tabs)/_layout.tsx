import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { UserProfileModalProvider } from '@/lib/contexts/UserProfileModalContext';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Tabs } from 'expo-router';
import { Compass, Gem, MessageCircle, User } from 'lucide-react-native';
import { colors } from '@/theme';

export default function TabLayout() {
  return (
    <BottomSheetModalProvider>
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
            title: 'Gym Gems',
            tabBarIcon: ({ color, size }) => <Gem size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Crushes',
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
    </BottomSheetModalProvider>
  );
}
