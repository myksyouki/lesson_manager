import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  SafeAreaView,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from './store/auth';
import { useLessonStore } from './store/lessons';
import LessonCard from './components/LessonCard';
import { useRouter } from 'expo-router';
import { logout } from './services/authService';
import { runChatRoomMigration } from './migration';
import { StatusBar } from 'expo-status-bar';

export default function SettingsScreen() {
  const { signOut, user, setUser } = useAuthStore();
  const { getFavorites } = useLessonStore();
  const favoriteLesson = getFavorites();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setUser(null);
      router.replace('/auth/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      Alert.alert('エラー', 'ログアウト中にエラーが発生しました。');
    } finally {
      setLoggingOut(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'ログアウト確認',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'ログアウト', onPress: handleLogout }
      ]
    );
  };

  const handleRunMigration = async () => {
    try {
      Alert.alert(
        'データ移行確認',
        'チャットルームデータを新しい構造に移行しますか？\n\nこのプロセスは数秒かかる場合があります。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '移行実行', 
            onPress: async () => {
              setMigrating(true);
              try {
                await runChatRoomMigration();
              } finally {
                setMigrating(false);
              }
            } 
          }
        ]
      );
    } catch (error) {
      console.error('移行エラー:', error);
      Alert.alert('エラー', '移行処理中にエラーが発生しました。');
      setMigrating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>設定</Text>
          {user && (
            <Text style={styles.subtitle}>
              ログイン中: {user.email}
            </Text>
          )}
        </View>

        {/* 一般設定セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>一般設定</Text>
          <TouchableOpacity style={styles.infoItem} onPress={() => router.push('/notifications')}>
            <Text style={styles.infoLabel}>通知設定</Text>
            <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoItem} onPress={() => router.push('/privacy-policy')}>
            <Text style={styles.infoLabel}>プライバシーポリシー</Text>
            <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.infoItem} 
            onPress={() => router.push('/theme-settings')}
          >
            <Text style={styles.infoLabel}>テーマ設定</Text>
            <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.infoItem} 
            onPress={() => router.push('/instrument-settings')}
          >
            <Text style={styles.infoLabel}>楽器・モデル設定</Text>
            <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoItem} onPress={() => alert('キャッシュをクリアしました')}>
            <Text style={styles.infoLabel}>キャッシュをクリア</Text>
            <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoItem} onPress={() => router.push('/sync')}>
            <Text style={styles.infoLabel}>データ同期</Text>
            <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* 新規追加: ログアウトボタンを一般設定の下、アプリ情報の上に配置 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.button}
            onPress={confirmLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>ログアウト</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ情報</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>バージョン</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>開発者</Text>
            <Text style={styles.infoValue}>Lesson Manager Team</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>デバッグ</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.debugButton]}
            onPress={handleRunMigration}
            disabled={migrating}
          >
            {migrating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="git-branch-outline" size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>チャットルームデータ移行</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.homeButton} onPress={() => router.push("/")}>
          <Ionicons name="home" size={24} color="white" />
          <Text style={styles.homeButtonText}>HOMEに戻る</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInitial: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 16,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  infoValue: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptyFavorites: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyFavoritesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptyFavoritesSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    marginLeft: 8, // アイコンとテキストの間隔
  },
  footer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButton: {
    backgroundColor: '#F6AB00',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
