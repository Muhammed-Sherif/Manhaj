import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useForm } from 'react-hook-form';
import {
  AuthHeader,
  GoogleSignInButton,
  AuthSubmitButton,
  ControlledInput,
  AuthToggle,
  type AuthFormData,
} from '../../components/auth';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<AuthFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    mode: 'onBlur',
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-slate-900"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHeader />

        <GoogleSignInButton />

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <Text className="mx-4 text-slate-400 dark:text-slate-500 font-medium text-xs uppercase tracking-wider">
            or
          </Text>
          <View className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </View>

        {!isLogin && (
          <ControlledInput
            control={control}
            name="name"
            placeholder="Full Name"
            autoCapitalize="words"
            editable={!isSubmitting}
            rules={{
              required: 'Full name is required',
              minLength: {
                value: 2,
                message: 'Name must be at least 2 characters',
              },
            }}
          />
        )}

        <ControlledInput
          control={control}
          name="email"
          placeholder="Email Address"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isSubmitting}
          rules={{
            required: 'Email address is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Please enter a valid email address',
            },
          }}
        />

        <ControlledInput
          control={control}
          name="password"
          placeholder="Password"
          isPassword
          editable={!isSubmitting}
          rules={{
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters',
            },
          }}
        />

        <AuthSubmitButton
          isLogin={isLogin}
          isSubmitting={isSubmitting}
          handleSubmit={handleSubmit}
        />

        <AuthToggle
          isLogin={isLogin}
          onToggle={() => {
            setIsLogin((prev) => !prev);
            reset();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
