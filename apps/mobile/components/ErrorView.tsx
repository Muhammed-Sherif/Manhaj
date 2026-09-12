import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface ErrorViewProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  title = 'Failed to load content',
  message = 'Please check your connection and try again',
  onRetry,
  retryText = 'Try Again',
  className = '',
}) => {
  return (
    <View className={`flex-1 bg-slate-50 dark:bg-slate-900 justify-center items-center p-4 ${className}`}>
      <Text className="text-red-600 dark:text-red-400 text-center mb-2 font-medium">{title}</Text>
      {!!message && <Text className="text-slate-600 dark:text-slate-400 text-center">{message}</Text>}
      {!!onRetry && (
        <TouchableOpacity
          className="mt-4 bg-teal-600 px-5 py-2.5 rounded-lg active:bg-teal-700"
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Text className="text-white font-medium text-sm">{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
