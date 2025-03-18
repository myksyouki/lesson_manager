import React, { useEffect } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from './store/auth';

export default function Root() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // @ts-ignore - 型エラーを無視
  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}
