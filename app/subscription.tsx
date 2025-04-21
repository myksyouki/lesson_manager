import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter, Redirect } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import SubscriptionButton from '../components/SubscriptionButton';
import SubscriptionStatus from '../components/SubscriptionStatus';

export default function SubscriptionScreen() {
  const auth = getAuth();
  const isLoggedIn = !!auth.currentUser;
  const router = useRouter();

  // サブスクリプション管理画面にリダイレクト
  return <Redirect href="/subscription/manage" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA'
  }
}); 