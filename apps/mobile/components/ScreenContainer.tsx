import React from 'react';
import { View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ScreenContainer({ style, ...props }: ViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        {
          flex: 1,
          paddingTop: insets.top,
        },
        style,
      ]}
    />
  );
}
