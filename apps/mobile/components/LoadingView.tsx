import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export interface LoadingViewProps {
  message?: string;
  size?: 'small' | 'large' | number;
  color?: string;
  className?: string;
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  message = 'Loading content...',
  size = 'large',
  color = '#0d9488',
  className = '',
}) => {
  return (
    <View className={`flex-1 bg-slate-50 dark:bg-slate-900 justify-center items-center ${className}`}>
      <ActivityIndicator size={size} color={color} />
      {!!message && <Text className="mt-4 text-slate-600 dark:text-slate-400">{message}</Text>}
    </View>
  );
};
