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
import { useAuthStore } from '../store/auth';
import { createChatRoom, addMessageToChatRoom, updateChatRoom } from '../services/chatRoomService';
import { getUserProfile } from '../services/userProfileService';
import { sendMessageToLessonAIHttp } from '../services/lessonAIService';
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

// 楽器ID→カタカナ表記のマッピング
const INSTRUMENT_KATAKANA_MAP: Record<string, string> = {
  saxophone: 'サックス',
  flute: 'フルート',
  clarinet: 'クラリネット',
  trumpet: 'トランペット',
  trombone: 'トロンボーン',
  piano: 'ピアノ',
  violin: 'バイオリン',
  guitar: 'ギター',
  // 必要に応じて追加
};

function getInstrumentKatakana(id: string | undefined): string {
  if (!id) return '';
  return INSTRUMENT_KATAKANA_MAP[id] || id;
}

export default function ChatRoomFormScreen() {
  const [title, setTitle] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userModelType, setUserModelType] = useState<string>('');
  const [instrumentName, setInstrumentName] = useState<string>('');
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
          setInstrumentName(getInstrumentKatakana(profile.selectedInstrument));
        } else {
          console.log('ユーザープロファイルが見つかりません、デフォルト設定を使用します');
          setUserModelType('standard');
          setInstrumentName('');
        }
      } catch (error) {
        console.error('ユーザープロファイル取得エラー:', error);
        setUserModelType('standard');
        setInstrumentName('');
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
          
          if (aiResponse && aiResponse.success && aiResponse.answer && aiResponse.answer !== '該当なし') {
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
            console.log('AIの応答が無効または「該当なし」のため、メッセージを追加しません');
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
              // 作成したチャットルームに直接遷移する
              router.push({
                pathname: `/chat-room`,
                params: { id: chatRoom.id }
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
        <ScrollView style={styles.scrollView} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={styles.header}>
            <Text style={styles.title}>新しいチャットを開始</Text>
            <Text style={styles.subtitle}>
              {instrumentName ? `${instrumentName}AIコーチに質問や相談ができます` : 'AIコーチに質問や相談ができます'}
            </Text>
          </View>

          <View style={styles.cardFormContainer}>
            <Text style={styles.label}>タイトル</Text>
            <TextInput
              style={styles.inputLarge}
              value={title}
              onChangeText={setTitle}
              placeholder="例: タンギングのコツについて"
              maxLength={50}
            />

            <Text style={styles.label}>トピック</Text>
            <View style={styles.topicsContainerImproved}>
              {TOPICS.map((topic) => (
                <TouchableOpacity
                  key={topic}
                  style={[
                    styles.topicButtonImproved,
                    selectedTopic === topic && styles.selectedTopicImproved,
                  ]}
                  onPress={() => {
                    setSelectedTopic(topic);
                    setCustomTopic(topic);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.topicTextImproved,
                      selectedTopic === topic && styles.selectedTopicTextImproved,
                    ]}
                  >
                    {selectedTopic === topic ? '✔️ ' : ''}{topic}
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
          </View>
        </ScrollView>

        <View style={styles.buttonContainerImproved}>
          <TouchableOpacity
            style={styles.cancelButtonImproved}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonTextImproved}>キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButtonImproved, loading && styles.disabledButton]}
            onPress={handleCreateRoom}
            disabled={loading || !title.trim()}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonTextImproved}>作成</Text>
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
  cardFormContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  inputLarge: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 20,
    fontSize: 18,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#B39DDB',
    fontWeight: '600',
  },
  topicsContainerImproved: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  topicButtonImproved: {
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedTopicImproved: {
    backgroundColor: '#E1F0FF',
    borderColor: '#7C4DFF',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  topicTextImproved: {
    fontSize: 15,
    color: '#7C4DFF',
    fontWeight: '500',
  },
  selectedTopicTextImproved: {
    color: '#4285F4',
    fontWeight: '700',
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
  buttonContainerImproved: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: 'white',
  },
  cancelButtonImproved: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 18,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonTextImproved: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  createButtonImproved: {
    flex: 1,
    backgroundColor: '#7C4DFF',
    borderRadius: 14,
    padding: 18,
    marginLeft: 12,
    alignItems: 'center',
    borderWidth: 0,
  },
  disabledButton: {
    backgroundColor: '#A2A2A2',
  },
  createButtonTextImproved: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 1,
  },
});
