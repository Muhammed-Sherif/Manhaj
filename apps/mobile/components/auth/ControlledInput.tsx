import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Control, Controller, FieldValues, Path, RegisterOptions } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react-native';

interface ControlledInputProps<T extends FieldValues> extends TextInputProps {
  control: Control<T>;
  name: Path<T>;
  placeholder: string;
  rules?: RegisterOptions<T, Path<T>>;
  isPassword?: boolean;
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  placeholder,
  rules,
  isPassword = false,
  ...textInputProps
}: ControlledInputProps<T>) {
  const [showPassword, setShowPassword] = useState(!isPassword);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View className="mb-4">
          <View className="relative justify-center">
            <TextInput
              style={{ paddingRight: isPassword ? 48 : 16 }}
              className={`bg-slate-50 dark:bg-slate-800 border rounded-lg p-4 text-base text-slate-900 dark:text-slate-100 ${
                error ? 'border-red-500 bg-red-50/20' : 'border-slate-200 dark:border-slate-700'
              }`}
              placeholder={placeholder}
              placeholderTextColor="#94a3b8"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value || ''}
              secureTextEntry={isPassword && !showPassword}
              {...textInputProps}
            />
            {isPassword && (
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  right: 14,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 20,
                  elevation: 5,
                }}
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#0d9488" />
                ) : (
                  <Eye size={20} color="#94a3b8" />
                )}
              </TouchableOpacity>
            )}
          </View>
          {error && (
            <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">
              {error.message}
            </Text>
          )}
        </View>
      )}
    />
  );
}
