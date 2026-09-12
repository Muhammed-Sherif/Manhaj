import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useNetInfo } from '@react-native-community/netinfo';
import { ChevronLeftIcon, WifiIcon, WifiOffIcon } from 'lucide-react-native';

export interface ScreenHeaderProps {
  title?: string | null;
  subtitle?: string | null;
  icon?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  showNetworkStatus?: boolean;
  rightAccessory?: React.ReactNode;
  className?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  icon,
  showBack = true,
  onBack,
  rightAccessory,
  className = '',
}) => {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected ?? true;
  const showNetworkStatus = isOnline ;
  return (
    <View className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 ${className}`}>
      <View className="flex-row items-center">
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            className="mr-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeftIcon size={24} color="#0d9488" />
          </TouchableOpacity>
        )}

        <View className="flex-1 mr-2">
          <View className="flex-row items-center">
            {!!icon && <View className="mr-2">{icon}</View>}
            <View className="flex-1">
              {!!title && (
                <Text className="font-semibold text-slate-800 dark:text-slate-100 text-base" numberOfLines={1}>
                  {title}
                </Text>
              )}
              {!!subtitle && (
                <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5" numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Right Accessory or Network Status */}
        {rightAccessory ? (
          rightAccessory
        ) : showNetworkStatus && isOnline !== undefined ? (
          <View
            className={`flex-row items-center ${
              isOnline ? 'bg-green-50 dark:bg-green-950/40' : 'bg-amber-50 dark:bg-amber-950/40'
            } px-2 py-1 rounded`}
          >
            {isOnline ? (
              <WifiIcon size={14} color="#22c55e" />
            ) : (
              <WifiOffIcon size={14} color="#f59e0b" />
            )}
            <Text className={`text-xs ml-1 ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};
