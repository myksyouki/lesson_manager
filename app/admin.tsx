import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Button
} from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function AdminScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('content');
  
  // ユーザーが管理者かどうかをチェック
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setIsLoading(true);
        
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
          Alert.alert('エラー', 'ログインが必要です。');
          router.replace('/');
          return;
        }
        
        const db = getFirestore();
        const userDocRef = doc(db, 'users', user.uid);
        const userSnapshot = await getDoc(userDocRef);
        
        const hasAdminRole = userSnapshot.exists() && userSnapshot.data()?.isAdmin === true;
        setIsAdmin(hasAdminRole);
        
        if (!hasAdminRole) {
          Alert.alert('アクセス拒否', '管理者権限が必要です。');
          router.replace('/');
        }
      } catch (error) {
        console.error('管理者ステータス確認エラー:', error);
        Alert.alert('エラー', '認証情報の確認中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, []);
  
  // 初期管理者を設定
  const setupInitialAdmin = async () => {
    try {
      const functions = getFunctions();
      const initializeAdminFunction = httpsCallable(functions, 'initializeAdmin');
      
      const result = await initializeAdminFunction();
      console.log('初期管理者設定結果:', result.data);
      
      Alert.alert('成功', '初期管理者が設定されました。');
    } catch (error) {
      console.error('初期管理者設定エラー:', error);
      Alert.alert('エラー', '初期管理者の設定中にエラーが発生しました。');
    }
  };
  
  // 管理者権限を付与
  const grantAdminRole = async (userId: string) => {
    try {
      const functions = getFunctions();
      const setAdminRoleFunction = httpsCallable(functions, 'setAdminRole');
      
      const result = await setAdminRoleFunction({
        userId,
        isAdmin: true
      });
      
      console.log('管理者権限付与結果:', result.data);
      Alert.alert('成功', `ユーザー ${userId} に管理者権限を付与しました。`);
    } catch (error) {
      console.error('管理者権限付与エラー:', error);
      Alert.alert('エラー', '管理者権限の付与中にエラーが発生しました。');
    }
  };
  
  // 管理者権限管理UI
  const AdminManagement = () => {
    const [userId, setUserId] = useState('');
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>管理者権限設定</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>ユーザーID</Text>
          <TextInput
            style={styles.input}
            value={userId}
            onChangeText={setUserId}
            placeholder="ユーザーIDを入力"
          />
        </View>
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => grantAdminRole(userId)}
            disabled={!userId}
          >
            <Text style={styles.buttonText}>管理者権限を付与</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.divider} />
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={setupInitialAdmin}
        >
          <Text style={styles.buttonText}>初期管理者を設定</Text>
        </TouchableOpacity>
        
        <Text style={styles.helpText}>
          注意: 初期管理者設定は最初のセットアップ時にのみ使用してください。
        </Text>
      </View>
    );
  };
  
  // 練習コンテンツ管理UI
  const ContentManagement = () => {
    return (
      <View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>練習コンテンツ管理</Text>
          <Text style={styles.description}>
            ここでは練習メニューと楽譜をセットで管理できます。
            新しい練習メニューを作成する際には、関連する楽譜も一緒に登録してください。
          </Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/admin/practice-menu')}
          >
            <MaterialIcons name="add-circle" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>新しい練習コンテンツを作成</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>登録済み練習コンテンツ</Text>
          <Text style={styles.description}>
            現在登録されている練習メニューと楽譜のリストです。
            編集や削除が必要な場合は項目をタップしてください。
          </Text>
          
          {/* TODO: ここに登録済みコンテンツのリストを表示する */}
          <View style={styles.emptyState}>
            <MaterialIcons name="library-music" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>登録されたコンテンツはまだありません</Text>
          </View>
        </View>
      </View>
    );
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7B68EE" />
      </View>
    );
  }
  
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text>管理者権限がありません</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: '管理者ページ',
          headerStyle: { backgroundColor: '#7B68EE' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <StatusBar style="light" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'content' && <ContentManagement />}
        {activeTab === 'users' && <AdminManagement />}
      </ScrollView>
      
      {/* タブナビゲーション (画面下部) */}
      <View style={styles.bottomTabContainer}>
        {[
          { id: 'home', label: 'ホーム', icon: 'home', route: '/' },
          { id: 'content', label: 'コンテンツ管理', icon: 'library-music' },
          { id: 'users', label: 'ユーザー管理', icon: 'people' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.bottomTab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => {
              if (tab.id === 'home') {
                router.push(tab.route as any);
              } else {
                setActiveTab(tab.id);
              }
            }}
          >
            <MaterialIcons 
              name={tab.icon as any} 
              size={24} 
              color={activeTab === tab.id ? '#7B68EE' : '#888'} 
            />
            <Text style={[
              styles.bottomTabLabel,
              activeTab === tab.id && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80, // タブナビゲーションの高さ分余白を確保
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  buttonGroup: {
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButton: {
    backgroundColor: '#7B68EE',
  },
  secondaryButton: {
    backgroundColor: '#6C757D',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  /* 下部タブナビゲーション用のスタイル */
  bottomTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bottomTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomTabLabel: {
    fontSize: 11,
    marginTop: 2,
    color: '#888',
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#7B68EE',
  },
  activeTabLabel: {
    color: '#7B68EE',
    fontWeight: 'bold',
  },
}); 