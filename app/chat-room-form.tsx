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
import { useRouter } from 'expo-router';
import { useAuthStore } from './store/auth';
import { createChatRoom } from './services/chatRoomService';
import { getUserProfile } from './services/userProfileService';

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
  const [initialMessage, setInitialMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userModelType, setUserModelType] = useState<string>('');
  const router = useRouter();
  const { user } = useAuthStore();

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

    if (!selectedTopic) {
      Alert.alert('エラー', 'トピックを選択してください');
      return;
    }

    if (!initialMessage.trim()) {
      Alert.alert('エラー', '最初のメッセージを入力してください');
      return;
    }

    try {
      setLoading(true);
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      console.log('チャットルーム作成開始:', {
        userId: user.uid,
        title: title.trim(),
        topic: selectedTopic,
        initialMessageLength: initialMessage.trim().length,
        modelType: userModelType || 'standard'
      });

      const chatRoom = await createChatRoom(
        title.trim(),
        selectedTopic,
        initialMessage.trim(),
        userModelType || 'standard'
      );

      console.log('チャットルーム作成成功:', chatRoom.id);

      router.replace({
        pathname: '/chat-room' as any,
        params: { id: chatRoom.id }
      });
    } catch (error) {
      console.error('チャットルーム作成エラー:', error);
      Alert.alert('エラー', 'チャットルームの作成に失敗しました。後でもう一度お試しください。');
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
                  onPress={() => setSelectedTopic(topic)}
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
            disabled={loading || !title.trim() || !selectedTopic || !initialMessage.trim()}
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
