import { Tabs } from 'expo-router';

import { BottomNav } from '@/components/nav/bottom-nav';

export const unstable_settings = {
  initialRouteName: 'explore',
};

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="explore"
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="chats" options={{ title: 'Messages' }} />
      {/* <Tabs.Screen name="tickets" options={{ title: 'Tickets' }} /> */}
      <Tabs.Screen name="profile" options={{ title: 'Profile', href: null }} />
    </Tabs>
  );
}
