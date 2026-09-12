import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

interface AuthToggleProps {
  isLogin: boolean;
  onToggle: () => void;
}

export function AuthToggle({ isLogin, onToggle }: AuthToggleProps) {
  return (
    <TouchableOpacity onPress={onToggle} className="py-2" activeOpacity={0.7}>
      <Text className="text-teal-600 dark:text-teal-400 text-center text-sm font-medium">
        {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
      </Text>
    </TouchableOpacity>
  );
}
