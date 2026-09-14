import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'nativewind';
import { HomeIcon, BookOpenIcon, FlagIcon, SettingsIcon, CheckSquareIcon } from 'lucide-react-native';

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export default function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getIcon = (routeName: string, isFocused: boolean) => {
    const color = isFocused ? '#0d9488' : '#94a3b8';
    switch (routeName) {
      case 'index':
        return <HomeIcon size={24} color={color} />;
      case 'browse':
        return <BookOpenIcon size={24} color={color} />;
      case 'review':
        return <FlagIcon size={24} color={color} />;
      case 'settings':
        return <SettingsIcon size={24} color={color} />;
      case 'tasks':
        return <CheckSquareIcon size={24} color={color} />;
      default:
        return null;
    }
  };

  return (
    <View className={`flex-row items-center justify-around py-3 ${isDark ? 'bg-slate-800' : 'bg-white'} border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            className="flex-1 items-center justify-center"
            activeOpacity={0.7}
          >
            {getIcon(route.name, isFocused)}
            <Text className={`text-xs mt-1 ${isFocused ? 'text-teal-600' : 'text-slate-400'}`}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
