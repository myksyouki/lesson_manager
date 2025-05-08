import React, { useState, useEffect } from 'react';
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
  Pressable,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';
import { useRouter } from 'expo-router';
import { logout } from '../services/authService';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '../store/settings';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useTheme } from '@react-navigation/native';

// MenuItemの型定義
interface MenuItemProps {
  icon: string;
  text: string;
  onPress: () => void;
  iconColor?: string;
}

export default function SettingsScreen() {
  const { user, setUser, signOut, isDemo, exitDemoMode } = useAuthStore();
  const { theme, clearCache } = useSettingsStore();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const themeStyles = useTheme();

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setUser(null);
      router.replace('/auth/login' as any);
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
    router.push('/privacy-policy');
  };

  const openTermsOfService = () => {
    router.push('/terms-of-service');
  };

  const openSupport = () => {
    router.push('/help-support');
  };
  
  // ユーザーが管理者かどうかをチェック
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const db = getFirestore();
          const userDocRef = doc(db, 'users', user.uid);
          const userSnapshot = await getDoc(userDocRef);
          
          setIsAdmin(userSnapshot.exists() && userSnapshot.data()?.isAdmin === true);
        }
      } catch (error) {
        console.error('管理者ステータス確認エラー:', error);
      }
    };
    
    checkAdminStatus();
  }, []);
  
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

  // 管理者メニューを追加
  function AdminMenuItem() {
    // 管理者でない場合は表示しない
    if (!isAdmin) return null;
    
    return (
      <Pressable
        onPress={() => router.push('/admin')}
        style={({ pressed }) => [
          styles.settingItem,
          { backgroundColor: pressed ? '#F0F0F0' : 'white' }
        ]}
      >
        <View style={styles.settingContent}>
          <MaterialIcons name="admin-panel-settings" size={24} color="#7B68EE" />
          <Text style={styles.settingText}>管理者ページ</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#CCCCCC" />
      </Pressable>
    );
  }

  // デモモードからアカウント作成画面への遷移
  const handleCreateAccount = () => {
    router.push('/auth/register');
  };

  // デモモードを終了して通常のログイン画面に戻る
  const handleExitDemo = async () => {
    try {
      await exitDemoMode();
      router.replace('/auth/login');
    } catch (error) {
      console.error('デモモード終了エラー:', error);
    }
  };

  // デモモード時のアカウント作成セクション
  const renderDemoModeSection = () => {
    if (!isDemo) return null;
    
    return (
      <View style={[styles.section, { backgroundColor: '#F5F5F5' }]}>
        <View style={styles.sectionTitleContainer}>
          <MaterialIcons name="account-circle" size={24} color="#4285F4" />
          <Text style={styles.sectionTitle}>デモモード</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.accountButton, { backgroundColor: '#4285F4' }]}
            onPress={handleCreateAccount}
          >
            <MaterialIcons name="person-add" size={20} color="white" />
            <Text style={styles.accountButtonText}>アカウントを作成する</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.exitButton, { backgroundColor: 'white', borderColor: '#DDDDDD' }]}
            onPress={handleExitDemo}
          >
            <MaterialIcons name="logout" size={20} color="#333333" />
            <Text style={[styles.exitButtonText, { color: '#333333' }]}>デモモードを終了</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeStyles.colors.background }]}>
      <StatusBar style="dark" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeStyles.colors.text }]}>設定</Text>
          {user && (
            <Text style={styles.subtitle}>
              ログイン中: {user.email}
            </Text>
          )}
        </View>

        {/* デモモード時のアカウント作成セクション */}
        {renderDemoModeSection()}

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
          
          <MenuItem 
            icon="payments" 
            text="サブスクリプション管理" 
            onPress={() => router.push('/subscription/manage')}
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
            icon="school" 
            text="オンボーディング画面" 
            onPress={() => router.push('/onboarding')}
          />
          
          <MenuItem 
            icon="color-lens" 
            text="テーマ設定" 
            onPress={() => router.push('/theme-settings')}
          />
          
          {/* 通知設定は一時的にクローズ
          <MenuItem 
            icon="notifications" 
            text="通知設定" 
            onPress={() => router.push('/notifications')}
          />
          */}

          <MenuItem 
            icon="privacy-tip" 
            text="プライバシーポリシー" 
            onPress={openPrivacyPolicy}
          />

          <MenuItem 
            icon="description" 
            text="利用規約" 
            onPress={openTermsOfService}
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

          <MenuItem 
            icon="bug-report" 
            text="エラー報告" 
            onPress={() => router.push('/error-report')}
          />
        </View>

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
              <Text style={styles.infoValue}>0.1.1</Text>
            </View>
            <View style={[styles.infoItem, styles.noBorder]}>
              <Text style={styles.infoLabel}>開発者</Text>
              <Text style={styles.infoValue}>Regnition inc.</Text>
            </View>
          </View>
        </View>

        {/* 管理者メニューを追加 */}
        <AdminMenuItem />
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
    paddingVertical: 18,
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
    lineHeight: 22,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 16,
  },
  buttonContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
  },
  accountButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
});
