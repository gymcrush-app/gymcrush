import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { UserProfileModalProvider } from '@/lib/contexts/UserProfileModalContext';
import { DEFAULT_GYM_GEMS_DISTANCE_KM, fetchGymGems } from '@/lib/api/gymGems';
import { fetchConversations, fetchMessageRequests } from '@/lib/api/messages';
import { fetchProfile } from '@/lib/api/profiles';
import { useAuthStore } from '@/lib/stores/authStore';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { Compass, Gem, MessageCircle, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { colors } from '@/theme';

export default function TabLayout() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  // Warm the cache for non-Discover tabs in the background as soon as the user
  // is authenticated. By the time they tap Crushes / Gym Gems / Profile, the
  // useQuery hooks read from cache and render instantly.
  useEffect(() => {
    if (!userId) return;
    queryClient.prefetchQuery({
      queryKey: ['conversations', userId],
      queryFn: () => fetchConversations(userId, queryClient),
    });
    queryClient.prefetchQuery({
      queryKey: ['messageRequests', userId],
      queryFn: () => fetchMessageRequests(userId),
    });
    // Best-effort prefetch with no filters — when the user has no age/gender
    // prefs set, this cache entry is reused by the Gym Gems screen. Otherwise
    // the screen's own filtered fetch supersedes.
    queryClient.prefetchQuery({
      queryKey: ['gymGems', userId, DEFAULT_GYM_GEMS_DISTANCE_KM, null, null, null],
      queryFn: () => fetchGymGems(DEFAULT_GYM_GEMS_DISTANCE_KM),
    });
    queryClient.prefetchQuery({
      queryKey: ['profile', userId],
      queryFn: () => fetchProfile(userId),
    });
  }, [userId, queryClient]);

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
