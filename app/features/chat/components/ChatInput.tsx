import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  testFunctionConnection, 
  testHttpEcho, 
  sendMessageToLessonAI,
  testDifyApiConnection,
  testDifyDirectApiConnection,
  testDifyApiVariations,
  createTestChatRoom
} from '../../../services/lessonAIService';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
}

interface ChatInputProps {
  message: string;
  onChangeMessage: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  roomId: string;
  instrument: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  message,
  onChangeMessage,
  onSend,
  sending,
  roomId,
  instrument,
}) => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResults, setTestResults] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResultArray, setTestResultArray] = useState<TestResult[]>([]);

  // 接続テスト
  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);
      setTestResults(null);
      setTestSuccess(null);
      
      console.log('接続テスト開始...');
      
      // まずテスト用のチャットルームを作成
      let testRoomId = "test-room-id";
      try {
        testRoomId = await createTestChatRoom();
        console.log('テスト用チャットルーム作成完了:', testRoomId);
      } catch (roomError) {
        console.error('テスト用チャットルーム作成失敗:', roomError);
      }
      
      // Firebase Functionsの接続テスト
      const functionResult = await testFunctionConnection();
      console.log('Firebase Functions接続テスト結果:', functionResult);
      
      // Firebase Functions接続が成功したら、続けてDify APIの接続テスト
      if (functionResult.success) {
        try {
          console.log('実際のメッセージテスト開始...');
          const chatResult = await sendMessageToLessonAI(
            'これはテストメッセージです', 
            '', // 空の会話IDで新しい会話を開始
            'standard',
            testRoomId, // 作成したテスト用ルームIDを使用
            true // テストモード
          );
          console.log('メッセージテスト結果:', chatResult);
          
          // レスポンスのanswerプロパティが存在するか確認
          if (chatResult && chatResult.success) {
            const answerText = chatResult.answer 
              ? chatResult.answer.substring(0, 50) 
              : 'レスポンスデータはありますが、answerプロパティがありません';
            
            setTestResults(`Firebase Functions: ✅ 成功\nDify API: ✅ 成功\n応答: ${answerText}...\nルームID: ${testRoomId}`);
            setTestSuccess(true);
          } else {
            setTestResults(`Firebase Functions: ✅ 成功\nDify API: ⚠️ レスポンスエラー\nデータ形式: ${JSON.stringify(chatResult || {}).substring(0, 100)}...\nルームID: ${testRoomId}`);
            setTestSuccess(false);
          }
        } catch (chatError) {
          console.error('メッセージ送信テストエラー:', chatError);
          setTestResults(`Firebase Functions: ✅ 成功\nDify API: ❌ 失敗\nエラー: ${chatError}\nルームID: ${testRoomId}`);
          setTestSuccess(false);
        }
      } else {
        setTestResults(`Firebase Functions: ❌ 失敗\nエラー: ${functionResult.message}`);
        setTestSuccess(false);
      }
    } catch (error) {
      console.error('接続テスト全体エラー:', error);
      setTestResults(`テスト失敗: ${error}`);
      setTestSuccess(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // テスト機能追加
  const runTests = async () => {
    setLoading(true);
    setTestResultArray([]);
    
    try {
      // テスト用チャットルームを作成
      let testRoomId = "";
      try {
        testRoomId = await createTestChatRoom();
        setTestResultArray(prev => [...prev, {
          name: 'テストチャットルーム作成',
          success: true,
          message: `ルームID: ${testRoomId}`
        }]);
      } catch (roomError) {
        console.error('テスト用チャットルーム作成失敗:', roomError);
        setTestResultArray(prev => [...prev, {
          name: 'テストチャットルーム作成',
          success: false,
          message: `エラー: ${roomError}`
        }]);
      }

      // Firebase Functions接続テスト
      const firebaseTest = await testFunctionConnection();
      setTestResultArray(prev => [...prev, {
        name: 'Firebase Functions接続',
        success: firebaseTest.success,
        message: firebaseTest.message
      }]);
      
      // 実際のメッセージ送信テスト
      if (firebaseTest.success && testRoomId) {
        const chatTest = await sendMessageToLessonAI('テストメッセージ', '', 'standard', testRoomId, true);
        setTestResultArray(prev => [...prev, {
          name: 'メッセージ送信',
          success: chatTest.success,
          message: chatTest.success 
            ? `成功: ${chatTest.answer?.substring(0, 30)}...` 
            : `失敗: ${chatTest.message || 'Unknown error'}`
        }]);
      } else if (roomId) {
        // 既存のルームIDを使用する場合のテスト
        const chatTest = await sendMessageToLessonAI('テストメッセージ', '', instrument || '', roomId, true);
        setTestResultArray(prev => [...prev, {
          name: '既存ルームでのメッセージ送信',
          success: chatTest.success,
          message: chatTest.success ? 'メッセージ送信成功' : chatTest.message
        }]);
      }
    } catch (error: any) {
      console.error('テスト実行エラー:', error);
      setTestResultArray(prev => [...prev, {
        name: 'テスト実行',
        success: false,
        message: `エラー: ${error}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {testResults && (
        <View style={[
          styles.testResultContainer, 
          { backgroundColor: testSuccess ? '#e6ffe6' : '#ffe6e6' }
        ]}>
          <Text style={styles.testResultText}>{testResults}</Text>
          <TouchableOpacity 
            onPress={() => setTestResults(null)} 
            style={styles.closeButton}
          >
            <Ionicons name="close-circle" size={20} color="#555" />
          </TouchableOpacity>
        </View>
      )}
      
      {testResultArray.length > 0 && (
        <View style={styles.testResultsArrayContainer}>
          {testResultArray.map((result, index) => (
            <View 
              key={`test-${index}`}
              style={[
                styles.testResultItem, 
                { backgroundColor: result.success ? '#e6ffe6' : '#ffe6e6' }
              ]}
            >
              <Text style={styles.testResultName}>{result.name}: {result.success ? '✓ 成功' : '✗ 失敗'}</Text>
              <Text style={styles.testResultMessage}>{result.message}</Text>
            </View>
          ))}
          <TouchableOpacity 
            onPress={() => setTestResultArray([])} 
            style={styles.closeButton}
          >
            <Ionicons name="close-circle" size={20} color="#555" />
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={onChangeMessage}
          placeholder="メッセージを入力..."
          multiline
          maxLength={2000}
          placeholderTextColor="#888"
          editable={!sending}
        />
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.iconButton, styles.testButton]}
            onPress={handleTestConnection}
            disabled={isTestingConnection || sending}
          >
            {isTestingConnection ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="pulse" size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.iconButton, styles.testButton, {marginLeft: 5, backgroundColor: '#7C4DFF'}]}
            onPress={runTests}
            disabled={loading || sending}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="construct" size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.iconButton, styles.sendButton, !message.trim() && styles.disabledButton]}
            onPress={onSend}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  testResultContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  testResultText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  closeButton: {
    padding: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingRight: 40,
    fontSize: 16,
    backgroundColor: '#F8F8F8',
  },
  buttonGroup: {
    flexDirection: 'row',
    marginLeft: 8,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  testButton: {
    backgroundColor: '#7B68EE',
  },
  sendButton: {
    backgroundColor: '#4285F4',
  },
  disabledButton: {
    opacity: 0.5,
  },
  testResultsArrayContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  testResultItem: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 4,
    marginBottom: 4,
  },
  testResultName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  testResultMessage: {
    fontSize: 14,
  },
});
