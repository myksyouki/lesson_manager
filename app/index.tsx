import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Text } from 'react-native';
import { useTaskStore } from './store/tasks';
import { useAuth } from './services/auth';
import TaskList from './features/tasks/components/TaskList';
import TaskCategorySummary from './features/tasks/components/TaskCategorySummary';
import { Task } from './types/task';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { Redirect } from 'expo-router';

// カテゴリサマリーの型定義
interface CategorySummary {
  name: string;
  completedCount: number;
  totalCount: number;
  icon: JSX.Element;
  color: string;
}

export default function Index() {
  const { user } = useAuth();

  // ユーザーがログインしていない場合はログイン画面にリダイレクト
  // ログイン済みの場合はタブナビゲーションのホーム画面にリダイレクト
  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  content: {
    flex: 1,
  },
});
