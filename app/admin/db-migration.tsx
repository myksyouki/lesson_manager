import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { 
  getConfig, 
  isUsingUserBasedStructure, 
  DatabaseStructure 
} from '../../config/appConfig';
import { changeDatabaseStructure } from '../../services/dbConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../../config/firebase';

export default function DatabaseMigrationScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');
  const [currentStructure, setCurrentStructure] = useState<DatabaseStructure>(DatabaseStructure.LEGACY);
  const [userCount, setUserCount] = useState(0);
  const [migratedUsers, setMigratedUsers] = useState(0);
  const [error, setError] = useState('');
  
  const functions = getFunctions();
  functions.region = "asia-northeast1";
  
  // 管理者確認
  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }
      
      // ここで管理者権限のチェックを行う（実際のアプリに合わせて実装）
    };
    
    checkAdmin();
    
    // 現在のデータベース構造を取得
    const config = getConfig();
    setCurrentStructure(config.databaseStructure);
  }, []);
  
  // 現在のデータベース構造のステータスを表示するための文字列
  const getStructureStatusText = () => {
    return currentStructure === DatabaseStructure.USER_BASED 
      ? 'ユーザーベース（新構造）' 
      : '従来型（旧構造）';
  };
  
  // データベース構造の切り替え
  const toggleDatabaseStructure = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const newStructure = !isUsingUserBasedStructure();
      await changeDatabaseStructure(newStructure);
      
      setCurrentStructure(newStructure ? DatabaseStructure.USER_BASED : DatabaseStructure.LEGACY);
      
      setMigrationStatus(`データベース構造を${newStructure ? 'ユーザーベース' : '従来型'}に変更しました`);
      
      setIsLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`構造変更エラー: ${errorMessage}`);
      setIsLoading(false);
    }
  };
  
  // 単一ユーザーのデータ移行
  const migrateCurrentUser = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error('ログインが必要です');
      }
      
      const migrateUserData = httpsCallable(functions, 'migrateUserData');
      const result = await migrateUserData({ userId: user.uid });
      
      setMigrationStatus(`現在のユーザーデータの移行が完了しました: ${JSON.stringify(result.data)}`);
      
      setIsLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`データ移行エラー: ${errorMessage}`);
      setIsLoading(false);
    }
  };
  
  // 全ユーザーのデータ移行
  const migrateAllUsers = async () => {
    try {
      // 確認ダイアログ
      Alert.alert(
        '全ユーザーデータの移行',
        'この操作は全ユーザーのデータを移行します。時間がかかる場合があります。続行しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '続行', 
            onPress: async () => {
              try {
                setIsLoading(true);
                setError('');
                
                const migrateAllUsersData = httpsCallable(functions, 'migrateAllUsersData');
                const result = await migrateAllUsersData({});
                const data = result.data as any;
                
                if (data.success) {
                  setUserCount(data.summary.total);
                  setMigratedUsers(data.summary.succeeded);
                  setMigrationStatus(`全ユーザーデータの移行が完了しました: 成功=${data.summary.succeeded}/${data.summary.total}`);
                } else {
                  throw new Error('移行処理中にエラーが発生しました');
                }
                
                setIsLoading(false);
              } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(`全ユーザーデータ移行エラー: ${errorMessage}`);
                setIsLoading(false);
              }
            } 
          }
        ]
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`エラー: ${errorMessage}`);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'データベース移行' }} />
      
      <View style={styles.section}>
        <Text style={styles.title}>データベース構造管理</Text>
        <Text style={styles.description}>
          このツールを使用して、データベース構造の変更とデータの移行を行います。
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>現在の構造</Text>
        <Text style={styles.statusText}>{getStructureStatusText()}</Text>
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.disabledButton]} 
          onPress={toggleDatabaseStructure}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isUsingUserBasedStructure() ? '従来型構造に切り替え' : 'ユーザーベース構造に切り替え'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>データ移行</Text>
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.disabledButton]} 
          onPress={migrateCurrentUser}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>現在のユーザーデータを移行</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton, isLoading && styles.disabledButton]} 
          onPress={migrateAllUsers}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>全ユーザーデータを移行（管理者のみ）</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>処理中...</Text>
        </View>
      )}
      
      {migrationStatus !== '' && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{migrationStatus}</Text>
          
          {userCount > 0 && (
            <Text style={styles.statusDetail}>
              移行状況: {migratedUsers}/{userCount} ユーザー ({Math.round(migratedUsers/userCount*100)}%)
            </Text>
          )}
        </View>
      )}
      
      {error !== '' && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  section: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  statusContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 5,
    marginVertical: 10,
  },
  statusText: {
    fontSize: 16,
  },
  statusDetail: {
    fontSize: 14,
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 5,
    marginVertical: 10,
  },
  errorText: {
    color: '#c62828',
    fontSize: 16,
  },
}); 