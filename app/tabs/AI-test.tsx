import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { testFunctionConnection, testHttpEcho, createTestChatRoom, sendMessageToLessonAI, testSimpleConnection } from '../services/lessonAIService';
import Constants from 'expo-constants';
import axios from 'axios';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: any;
}

export default function AITest() {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testMessage, setTestMessage] = useState('こんにちは、テストメッセージです');
  const [testRoomId, setTestRoomId] = useState('');
  const [directHttpLoading, setDirectHttpLoading] = useState(false);

  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // Firebase Functions接続テスト
      console.log('Firebase Functions接続テスト開始');
      const connectionResult = await testFunctionConnection();
      setTestResults(prev => [...prev, {
        name: 'Firebase Functions接続テスト',
        success: connectionResult.success,
        message: connectionResult.message,
        details: null
      }]);

      if (!connectionResult.success) {
        throw new Error('Firebase Functionsへの接続に失敗したため、以降のテストをスキップします');
      }

      // テストチャットルーム作成
      console.log('テストチャットルーム作成中...');
      const newRoomId = await createTestChatRoom();
      setTestRoomId(newRoomId);
      setTestResults(prev => [...prev, {
        name: 'テストチャットルーム作成',
        success: true,
        message: `チャットルームID: ${newRoomId}`,
        details: null
      }]);

      // メッセージ送信テスト
      console.log('メッセージ送信テスト開始...');
      const startTime = new Date().getTime();
      
      try {
        const messageResult = await sendMessageToLessonAI(
          testMessage,
          '', // 新規会話
          'standard', // 標準モード
          newRoomId,
          true // テストモード
        );
        
        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;
        
        setTestResults(prev => [...prev, {
          name: 'メッセージ送信テスト',
          success: messageResult.success === true,
          message: messageResult.success ? 
            `${processingTime}ms で成功: ${messageResult.answer?.substring(0, 100)}` : 
            `${processingTime}ms で失敗: ${messageResult.message || '不明'}`,
          details: messageResult
        }]);
      } catch (error: any) {
        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;
        
        console.error('メッセージ送信エラー:', error);
        setTestResults(prev => [...prev, {
          name: 'メッセージ送信テスト',
          success: false,
          message: `${processingTime}ms で失敗: ${error.message || '不明'}`,
          details: error
        }]);
      }
    } catch (error: any) {
      console.error('テスト実行エラー:', error);
      Alert.alert('エラー', error.message);
    } finally {
      setLoading(false);
    }
  };

  const testDirectHttp = async () => {
    setDirectHttpLoading(true);
    
    try {
      console.log('直接HTTPリクエストテスト開始');
      
      // プロジェクト情報
      const projectId = 'lesson-manager-99ab9';
      const region = 'asia-northeast1';
      const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/sendMessage`;
      
      console.log('直接HTTPリクエスト送信先:', functionUrl);
      
      // Callable関数のHTTPリクエスト形式
      const response = await axios.post(
        functionUrl, 
        {
          data: {
            message: testMessage,
            roomId: testRoomId || 'test-direct-http',
            instrument: 'test',
            conversationId: '',
            isTestMode: true
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      console.log('直接HTTPレスポンス:', response.data);
      
      // 結果を表示
      setTestResults(prev => [...prev, {
        name: '直接HTTP呼び出しテスト',
        success: response.data?.result?.success === true,
        message: `ステータスコード: ${response.status}, データ: ${JSON.stringify(response.data).substring(0, 100)}...`,
        details: response.data
      }]);
      
    } catch (error: any) {
      console.error('直接HTTPリクエストエラー:', error);
      setTestResults(prev => [...prev, {
        name: '直接HTTP呼び出しテスト',
        success: false,
        message: `エラー: ${error.message || '不明'}`,
        details: {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        }
      }]);
    } finally {
      setDirectHttpLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'AI機能テスト' }} />
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>Firebase Functions テスト</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>テストメッセージ:</Text>
          <TextInput
            style={styles.input}
            value={testMessage}
            onChangeText={setTestMessage}
            multiline
            numberOfLines={3}
            placeholder="テストメッセージを入力"
          />
          
          <Text style={styles.label}>テストルームID:</Text>
          <TextInput
            style={styles.input}
            value={testRoomId}
            onChangeText={setTestRoomId}
            placeholder="test-room-123456789"
          />
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={runAllTests}
              disabled={loading || directHttpLoading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>全テスト実行</Text>
              )}
            </TouchableOpacity>

            {testRoomId ? (
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={() => {
                  setLoading(true);
                  setTestResults([]);
                  sendMessageToLessonAI(testMessage, '', 'standard', testRoomId, true)
                    .then(result => {
                      setTestResults([{
                        name: 'メッセージ送信テスト',
                        success: result.success === true,
                        message: result.success ? `成功: ${result.answer?.substring(0, 100)}` : `失敗: ${result.message || '不明'}`,
                        details: result
                      }]);
                    })
                    .catch(error => {
                      setTestResults([{
                        name: 'メッセージ送信テスト',
                        success: false,
                        message: `エラー: ${error.message || '不明'}`,
                        details: error
                      }]);
                    })
                    .finally(() => setLoading(false));
                }}
                disabled={loading || directHttpLoading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>メッセージ送信</Text>
                )}
              </TouchableOpacity>
            ) : null}
            
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={testDirectHttp}
              disabled={loading || directHttpLoading}
            >
              {directHttpLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>直接HTTP呼び出し</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>テスト結果:</Text>

        {testResults.length > 0 ? (
          testResults.map((result, index) => (
            <View key={index} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{result.name}</Text>
                <Text style={[
                  styles.resultStatus,
                  result.success ? styles.success : styles.error
                ]}>
                  {result.success ? '成功' : '失敗'}
                </Text>
              </View>
              <Text style={styles.resultMessage}>{result.message}</Text>
              {result.details && (
                <View style={styles.details}>
                  <Text style={styles.detailsTitle}>詳細情報:</Text>
                  <Text style={styles.detailsContent}>
                    {JSON.stringify(result.details, null, 2)}
                  </Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyResults}>
            <Text style={styles.emptyText}>
              テスト結果はまだありません
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#007BFF',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 8,
    minWidth: '45%',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
    color: '#333',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  resultStatus: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  success: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  resultMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  details: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#495057',
  },
  detailsContent: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#495057',
  },
  emptyResults: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
}); 