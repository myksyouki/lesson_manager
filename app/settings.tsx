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
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from './store/auth';
import { useRouter } from 'expo-router';
import { logout } from './services/authService';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from './store/settings';

// MenuItemの型定義
interface MenuItemProps {
  icon: string;
  text: string;
  onPress: () => void;
  iconColor?: string;
}

export default function SettingsScreen() {
  const { user, setUser } = useAuthStore();
  const { theme, clearCache } = useSettingsStore();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setUser(null);
      router.replace('/login' as any);
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

  const handleClearCache = async () => {
    try {
      setClearingCache(true);
      Alert.alert(
        'キャッシュ削除確認',
        'アプリのキャッシュを削除しますか？\n\nこの操作はアプリのパフォーマンスを一時的に低下させる可能性があります。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '削除する', 
            onPress: async () => {
              try {
                await clearCache();
                Alert.alert('完了', 'キャッシュが正常に削除されました。');
              } catch (error) {
                console.error('キャッシュ削除エラー:', error);
                Alert.alert('エラー', 'キャッシュの削除中にエラーが発生しました。');
              } finally {
                setClearingCache(false);
              }
            } 
          }
        ]
      );
    } catch (error) {
      console.error('キャッシュ削除エラー:', error);
      Alert.alert('エラー', 'キャッシュの削除中にエラーが発生しました。');
    } finally {
      setClearingCache(false);
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://example.com/privacy-policy');
  };

  const openSupport = () => {
    Linking.openURL('https://example.com/support');
  };
  
  // ユーザーが管理者かどうかをチェック
  // 開発目的で一時的にtrueに設定。本番環境では適切な管理者チェックに置き換える
  const isAdmin = true; // 開発用：全てのユーザーに管理者機能を表示
  
  // メニュー項目コンポーネント
  const MenuItem = ({ icon, text, onPress, iconColor = "#4A6572" }: MenuItemProps) => (
    <TouchableOpacity 
      style={styles.menuCard} 
      onPress={onPress}
    >
      <View style={styles.menuIconContainer}>
        <MaterialIcons name={icon as any} size={24} color={iconColor} />
      </View>
      <Text style={styles.menuItemText}>{text}</Text>
      <MaterialIcons name="chevron-right" size={24} color="#aaa" />
    </TouchableOpacity>
  );

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

        {/* アカウントセクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          {user && (
            <View style={styles.profileCard}>
              <View style={styles.avatarContainer}>
                {user.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.defaultAvatar]}>
                    <Text style={styles.avatarText}>{user.displayName?.[0] || user.email?.[0] || '?'}</Text>
                  </View>
                )}
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user.displayName || 'ユーザー'}</Text>
                <Text style={styles.userEmail}>{user.email || ''}</Text>
              </View>
            </View>
          )}

          <MenuItem 
            icon="person" 
            text="プロフィール設定" 
            onPress={() => router.push('/profile')}
          />
        </View>

        {/* アプリ設定セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ設定</Text>
          
          <MenuItem 
            icon="music-note" 
            text="楽器・モデル設定" 
            onPress={() => router.push('/instrument-settings')}
          />
          
          <MenuItem 
            icon="color-lens" 
            text="テーマ設定" 
            onPress={() => router.push('/theme-settings')}
          />
          
          <MenuItem 
            icon="notifications" 
            text="通知設定" 
            onPress={() => router.push('/notifications')}
          />

          <MenuItem 
            icon="privacy-tip" 
            text="データとプライバシー" 
            onPress={openPrivacyPolicy}
          />

          <MenuItem 
            icon="cleaning-services" 
            text="キャッシュ管理" 
            onPress={handleClearCache}
          />
        </View>

        {/* サポートセクション（新規） */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>サポート</Text>
          
          <MenuItem 
            icon="help-outline" 
            text="ヘルプとサポート" 
            onPress={openSupport}
          />
        </View>

        {/* 管理者向けセクション */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>管理者機能</Text>
            
            <MenuItem 
              icon="psychology" 
              text="楽器ナレッジベース管理" 
              onPress={() => router.push('/admin/knowledge-management' as any)}
              iconColor="#E53935"
            />
            
            <MenuItem 
              icon="storage" 
              text="データベース管理" 
              onPress={() => router.push('/admin/db-migration' as any)}
              iconColor="#E53935"
            />
          </View>
        )}

        {/* ログアウトセクション */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
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

        {/* アプリ情報セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ情報</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>バージョン</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={[styles.infoItem, styles.noBorder]}>
              <Text style={styles.infoLabel}>開発者</Text>
              <Text style={styles.infoValue}>Lesson Manager Team</Text>
            </View>
          </View>
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
    fontSize: 32,
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
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  noBorder: {
    borderBottomWidth: 0,
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
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    marginLeft: 8,
  },
  footer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  defaultAvatar: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
  },
});
