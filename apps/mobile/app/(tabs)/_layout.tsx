import { Tabs } from 'expo-router';
import { HomeIcon, BookOpenIcon, FlagIcon, SettingsIcon, CheckSquareIcon } from 'lucide-react-native';
import CustomTabBar from '../../components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => <BookOpenIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Review',
          tabBarIcon: ({ color }) => <FlagIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'My Tasks',
          tabBarIcon: ({ color }) => <CheckSquareIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
