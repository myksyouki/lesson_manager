import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from './store/auth';
import { createChatRoom, addMessageToChatRoom, updateChatRoom } from './services/chatRoomService';
import { getUserProfile } from './services/userProfileService';
import { sendMessageToLessonAIHttp } from './services/lessonAIService';
import { Timestamp } from 'firebase/firestore';

const TOPICS = [
  'タンギング',
  'ロングトーン',
  '音色',
  'リズム',
  'アーティキュレーション',
  'ビブラート',
  'テクニック',
  '表現力',
  'その他',
];

export default function ChatRoomFormScreen() {
  const [title, setTitle] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userModelType, setUserModelType] = useState<string>('');
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const profile = await getUserProfile();
        if (profile) {
          const modelType = profile.selectedCategory && profile.selectedInstrument && profile.selectedModel
            ? `${profile.selectedCategory}-${profile.selectedInstrument}-${profile.selectedModel}` 
            : 'standard';
          
          console.log('ユーザーモデルタイプ:', modelType);
          setUserModelType(modelType);
        } else {
          console.log('ユーザープロファイルが見つかりません、デフォルト設定を使用します');
          setUserModelType('standard');
        }
      } catch (error) {
        console.error('ユーザープロファイル取得エラー:', error);
        setUserModelType('standard');
      }
    };
    
    fetchUserProfile();
  }, [user]);

  const handleCreateRoom = async () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    try {
      setLoading(true);
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      // カスタムトピックか選択トピックのどちらかがあれば使用、なければデフォルト値
      const finalTopic = customTopic.trim() || selectedTopic || 'その他';
      // 初期メッセージが空の場合はデフォルトメッセージを使用
      const finalMessage = initialMessage.trim() || 'AIコーチとの会話を開始します';

      console.log('チャットルーム作成開始:', {
        userId: user.uid,
        title: title.trim(),
        topic: finalTopic,
        initialMessageLength: finalMessage.length,
        modelType: userModelType || 'standard'
      });

      const chatRoom = await createChatRoom(
        title.trim(),
        finalTopic,
        finalMessage,
        userModelType || 'standard'
      );

      console.log('チャットルーム作成成功:', chatRoom.id);

      // 初期メッセージがある場合、AIからの初期応答を生成
      if (finalMessage) {
        try {
          console.log('AIに初期メッセージを送信して応答を取得します');
          
          // AIモデルからの応答を取得
          const aiResponse = await sendMessageToLessonAIHttp(
            finalMessage,
            undefined,  // 新規会話なのでconversationIdはundefined
            userModelType || 'standard',
            chatRoom.id,
            false  // isTestMode
          );
          
          if (aiResponse && aiResponse.success) {
            // AIからの応答をチャットルームに追加
            const aiMessage = {
              id: `ai-${Date.now()}`,
              content: aiResponse.answer,
              sender: 'ai' as 'user' | 'ai' | 'system',
              timestamp: Timestamp.now(),
            };
            
            // チャットルームの会話IDを更新
            if (aiResponse.conversationId) {
              await updateChatRoom(chatRoom.id, {
                conversationId: aiResponse.conversationId
              });
            }
            
            // チャットルームにAIメッセージを追加
            await addMessageToChatRoom(
              chatRoom.id, 
              aiMessage, 
              aiResponse.conversationId
            );
            
            console.log('AIの初期応答を追加しました:', aiResponse.answer.substring(0, 50) + '...');
          } else {
            console.error('AI応答取得エラー:', aiResponse);
          }
        } catch (error) {
          console.error('AIの初期応答追加エラー:', error);
          // エラーがあっても処理を続行
        }
      }

      Alert.alert(
        'チャットルーム作成',
        'チャットルームが作成されました',
        [
          {
            text: 'OK',
            onPress: () => {
              // replaceを使用してナビゲーションスタックから現在の画面を削除
              router.replace({
                pathname: '/chat-room',
                params: { 
                  id: chatRoom.id
                }
              });
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('チャットルーム作成エラー:', error);
      let errorMessage = 'チャットルームの作成に失敗しました。後でもう一度お試しください。';
      
      // チャットルーム制限に関するエラーメッセージを確認
      if (error.message && error.message.includes('最大10つ')) {
        errorMessage = error.message;
      }
      
      Alert.alert('エラー', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>新しいチャットを開始</Text>
            <Text style={styles.subtitle}>
              AIと対話して練習メニューを作成しましょう
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>タイトル</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="例: フルートのタンギング練習について"
              maxLength={50}
            />

            <Text style={styles.label}>トピック</Text>
            <View style={styles.topicsContainer}>
              {TOPICS.map((topic) => (
                <TouchableOpacity
                  key={topic}
                  style={[
                    styles.topicButton,
                    selectedTopic === topic && styles.selectedTopic,
                  ]}
                  onPress={() => {
                    setSelectedTopic(topic);
                    setCustomTopic(topic);
                  }}
                >
                  <Text
                    style={[
                      styles.topicText,
                      selectedTopic === topic && styles.selectedTopicText,
                    ]}
                  >
                    {topic}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              value={customTopic}
              onChangeText={(text) => {
                setCustomTopic(text);
                if (selectedTopic && text !== selectedTopic) {
                  setSelectedTopic('');
                }
              }}
              placeholder="トピックを自由に入力（または上から選択）"
              maxLength={30}
            />

            <Text style={styles.label}>最初のメッセージ</Text>
            <TextInput
              style={styles.messageInput}
              value={initialMessage}
              onChangeText={setInitialMessage}
              placeholder="AIに質問や相談したいことを入力してください"
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, loading && styles.disabledButton]}
            onPress={handleCreateRoom}
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>作成</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
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
    color: '#8E8E93',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  topicButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTopic: {
    backgroundColor: '#E1F0FF',
  },
  topicText: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  selectedTopicText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  messageInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    height: 150,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: 'white',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginLeft: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#A2A2A2',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});
