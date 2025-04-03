import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/index';
import { useLessonStore } from '../store/lessons';
import { useAuthStore } from '../store/auth';
import { Lesson } from '../store/lessons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createChatRoom, addMessageToChatRoom, updateChatRoom } from '../services/chatRoomService';
import { getUserProfile, instrumentCategories } from '../services/userProfileService';
import { Timestamp } from 'firebase/firestore';
import { sendMessageToLessonAI, sendMessageToLessonAIHttp } from '../services/lessonAIService';

// 楽器カテゴリごとのトピックマッピング
const INSTRUMENT_TOPICS: Record<string, string[]> = {
  // 管楽器
  'saxophone': ['音色', '高音', '低音', 'タンギング', 'ヴィブラート'],
  'flute': ['音色', '高音', '低音', 'タンギング', 'ヴィブラート'],
  'clarinet': ['音色', '高音', '低音', 'タンギング', 'ヴィブラート'],
  'oboe': ['音色', '高音', '低音', 'タンギング', 'ヴィブラート'],
  'fagotto': ['音色', '高音', '低音', 'タンギング', 'ヴィブラート'],
  'horn': ['音色', '高音', '低音', 'タンギング', 'ヴィブラート'],
  'trumpet': ['音色', '高音', '低音', 'タンギング', 'ヴィブラート'],
  'trombone': ['音色', '高音', '低音', 'タンギング', 'ヴィブラート'],
  'euphonium': ['音色', '高音', '低音', 'タンギング', 'ヴィブラート'],
  'tuba': ['音色', '高音', '低音', 'タンギング', 'ヴィブラート'],
  
  // 弦楽器
  'violin': ['ボーイング', 'ビブラート', '音程', '姿勢', '表現技法'],
  'viola': ['ボーイング', 'ビブラート', '音程', '姿勢', '表現技法'],
  'cello': ['ボーイング', 'ビブラート', '音程', '姿勢', '表現技法'],
  'contrabass': ['ボーイング', 'ビブラート', '音程', '姿勢', '表現技法'],
  
  // ピアノ
  'piano': ['タッチ', '表現力', 'ペダル', 'リズム', 'アーティキュレーション'],
  
  // ボーカル
  'vocal': ['発声', '音程', '表現力', '呼吸法', '共鳴'],
  
  // デフォルト
  'default': ['テクニック', '表現力', 'リズム', 'アーティキュレーション', 'その他']
};

export default function ConsultAIScreen() {
  const { lessonIds, summaryContext, initialPrompt } = useLocalSearchParams();
  const [selectedLessons, setSelectedLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [userModelType, setUserModelType] = useState<string>('');
  const theme = useTheme();
  const { lessons } = useLessonStore();
  const { user } = useAuthStore();

  // レッスン詳細画面から受け取ったデータがあれば設定
  useEffect(() => {
    if (initialPrompt) {
      setInitialMessage(decodeURIComponent(initialPrompt as string));
    }
    
    // プロンプトの内容に基づいてトピックの初期値を設定
    if (initialPrompt && typeof initialPrompt === 'string') {
      const decodedPrompt = decodeURIComponent(initialPrompt as string);
      if (decodedPrompt.includes('演奏') || decodedPrompt.includes('表現')) {
        setSelectedTopic('表現力');
      } else if (decodedPrompt.includes('テクニック') || decodedPrompt.includes('技術')) {
        setSelectedTopic('テクニック');
      } else if (decodedPrompt.includes('リズム')) {
        setSelectedTopic('リズム');
      } else if (decodedPrompt.includes('音色')) {
        setSelectedTopic('音色');
      }
    }
  }, [initialPrompt]);

  // ユーザーのモデルタイプを取得
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const profile = await getUserProfile();
        if (profile) {
          // 楽器ID・モデルIDを取得
          const category = profile.selectedCategory || 'piano';
          const instrument = profile.selectedInstrument || 'piano';
          const model = profile.selectedModel || 'standard';
          
          // 楽器ID・モデルIDを設定（AIリクエスト用）
          const modelTypeStr = `${category}-${instrument}-${model}`;
          setUserModelType(modelTypeStr);
          
          // 楽器情報をコンソールに出力（デバッグ用）
          const categoryObj = instrumentCategories.find(c => c.id === category);
          const instrumentObj = categoryObj?.instruments.find(i => i.id === instrument);
          console.log(`選択された楽器: ${categoryObj?.name} > ${instrumentObj?.name || '不明'} (${instrument}) > ${model}`);
        }
      } catch (error) {
        console.error('ユーザープロファイル取得エラー:', error);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // 選択されたレッスンを取得
  useEffect(() => {
    if (!lessonIds || lessonIds.length === 0) {
      setIsLoading(false);
      return;
    }

    // サマリーコンテキストが含まれている場合は、レッスンデータを取得せずに続行
    if (summaryContext) {
      console.log('サマリーコンテキストが含まれているため、レッスンデータを取得せずに続行します');
      // サマリー情報からタイトルを設定
      setTitle('AIレッスン相談');
      setIsLoading(false);
      return;
    }

    // 普通にレッスンデータを取得する処理（既存コード）
    const fetchSelectedLessons = async () => {
      const ids = (lessonIds as string).split(',');
      
      try {
        // まずはストアから取得を試みる
        let lessonsData = lessons.filter(lesson => ids.includes(lesson.id));
        
        // ストアに存在しない場合は個別に取得
        if (lessonsData.length < ids.length) {
          const missingIds = ids.filter(id => !lessonsData.some(lesson => lesson.id === id));
          
          for (const id of missingIds) {
            const lessonDoc = await getDoc(doc(db, 'lessons', id));
            if (lessonDoc.exists()) {
              const data = lessonDoc.data();
              lessonsData.push({
                id: lessonDoc.id,
                teacher: data.teacher || data.teacherName || '',
                date: data.date || '',
                pieces: data.pieces || [],
                summary: data.summary || '',
                notes: data.notes || '',
                tags: data.tags || [],
                user_id: data.user_id || data.userId || '',
                audioUrl: data.audioUrl || data.audio_url || null,
                transcription: data.transcription || '',
                isFavorite: data.isFavorite || false,
                priority: data.priority || 'low',
              });
            }
          }
        }
        
        // レッスンデータが取得できたら、タイトルを自動生成
        if (lessonsData.length > 0) {
          // 最新のレッスン日付を取得（日付でソート）
          const sortedLessons = [...lessonsData].sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
          
          const latestLesson = sortedLessons[0];
          const formattedDate = formatDate(latestLesson.date);
          setTitle(`${formattedDate} レッスン相談`);
        }
        
        setSelectedLessons(lessonsData);
        setIsLoading(false);
      } catch (error) {
        console.error('レッスンデータ取得エラー:', error);
        Alert.alert('エラー', 'レッスンデータの取得に失敗しました');
        setIsLoading(false);
      }
    };

    fetchSelectedLessons();
  }, [lessonIds, lessons]);

  // チャットルームを作成する関数
  const createConsultationRoom = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    // サマリーコンテキストがある場合は、レッスンデータのチェックをスキップ
    if (!summaryContext && selectedLessons.length === 0) {
      Alert.alert('エラー', 'レッスンが選択されていません');
      return;
    }

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

    setIsCreating(true);

    try {
      // メッセージを準備
      let formattedMessage = '';
      
      // サマリーコンテキストがある場合は、それを使用
      if (summaryContext) {
        formattedMessage = `
以下のレッスンサマリーについて相談します：

${decodeURIComponent(summaryContext as string)}

${initialMessage}
`;
      } else {
        // レッスンデータを整形（既存コード）
        const lessonsData = selectedLessons.map(lesson => ({
          teacher: lesson.teacher,
          date: formatDate(lesson.date),
          pieces: lesson.pieces,
          summary: lesson.summary,
          notes: lesson.notes,
        }));

        // レッスンデータを含めた初期メッセージを作成
        formattedMessage = `
以下のレッスン記録について相談します：

${lessonsData.map((lesson, index) => `
【レッスン ${index + 1}】
講師: ${lesson.teacher}
日付: ${lesson.date}
曲目: ${lesson.pieces?.join(', ') || '記録なし'}
概要: ${lesson.summary || '記録なし'}
メモ: ${lesson.notes || '記録なし'}
`).join('\n')}

${initialMessage}
`;
      }

      // チャットルームを作成
      const chatRoom = await createChatRoom(
        title.trim(),
        selectedTopic,
        formattedMessage.trim(),
        userModelType || 'standard'
      );
      
      // AIサマリー情報が含まれている場合、AIからの最初の応答を生成する
      if (summaryContext) {
        try {
          // AIサマリーだけを取得
          const aiSummary = decodeURIComponent(summaryContext as string);
          
          // AIモデルにサマリー内容を送信して応答を取得
          console.log('AIにサマリー内容を送信して応答を取得します');
          
          // 初期メッセージを作成（AIへのプロンプト）
          const initialPrompt = `以下のレッスンサマリーを確認してください。このサマリーに基づいて、レッスンについて質問や相談に応えてください。
          
サマリー:
${aiSummary}

あなたはこのレッスンの内容を理解した上で、生徒の質問や相談に応えるAIコーチです。`;

          // AIモデルからの応答を取得
          const aiResponse = await sendMessageToLessonAI(
            initialPrompt,
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
            // エラーの場合は固定メッセージを表示
            const aiMessage = {
              id: `ai-${Date.now()}`,
              content: `今回のレッスンのサマリーを確認しました。どのような点について相談されたいですか？`,
              sender: 'ai' as 'user' | 'ai' | 'system',
              timestamp: Timestamp.now(),
            };
            
            // チャットルームにAIメッセージを追加
            await addMessageToChatRoom(chatRoom.id, aiMessage);
          }
        } catch (error) {
          console.error('AIの初期応答追加エラー:', error);
          // エラーの場合は固定メッセージを表示
          const aiMessage = {
            id: `ai-${Date.now()}`,
            content: `今回のレッスンのサマリーを確認しました。どのような点について相談されたいですか？`,
            sender: 'ai' as 'user' | 'ai' | 'system',
            timestamp: Timestamp.now(),
          };
          
          // チャットルームにAIメッセージを追加
          await addMessageToChatRoom(chatRoom.id, aiMessage);
        }
      }
      
      // 作成したチャットルームに遷移
      router.replace({
        pathname: '/chat-room' as any,
        params: { id: chatRoom.id }
      });
    } catch (error) {
      console.error('チャットルーム作成エラー:', error);
      setIsCreating(false);
      Alert.alert('エラー', 'チャットルームの作成に失敗しました');
    }
  };

  // 日付をフォーマットする関数
  const formatDate = (dateString: string | Date | { seconds: number; nanoseconds: number }) => {
    try {
      // Firestoreのタイムスタンプオブジェクトの場合
      if (dateString && typeof dateString === 'object' && 'seconds' in dateString) {
        const date = new Date(dateString.seconds * 1000);
        return date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      
      // 日付オブジェクトの場合
      if (dateString instanceof Date) {
        return dateString.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      
      // 日本語形式の日付文字列の場合（例: "2023年5月15日"）
      if (typeof dateString === 'string' && dateString.includes('年')) {
        return dateString;
      }
      
      // ISO形式の日付文字列の場合
      if (typeof dateString === 'string' && dateString) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      }
      
      // どの形式にも当てはまらない場合
      return '日付なし';
    } catch (error) {
      console.error('日付フォーマットエラー:', error, dateString);
      return '日付エラー';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.backgroundSecondary }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            // レッスンIDが存在する場合はレッスン詳細画面に戻る
            const ids = lessonIds ? 
              (typeof lessonIds === 'string' ? JSON.parse(lessonIds)[0] : lessonIds) 
              : null;
              
            if (ids) {
              router.replace({
                pathname: '/(lesson-detail)/[id]',
                params: { id: ids }
              });
            } else {
              // レッスンIDがない場合はAIレッスン画面に戻る
              router.replace('/tabs/ai-lesson');
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          AIに相談する
        </Text>
        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            レッスンデータを読み込み中...
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              選択したレッスン ({selectedLessons.length}件)
            </Text>
            
            {selectedLessons.map((lesson) => (
              <View 
                key={lesson.id}
                style={[styles.lessonItem, { backgroundColor: theme.colors.cardElevated }]}
              >
                <View style={styles.lessonHeader}>
                  <Text style={[styles.lessonTeacher, { color: theme.colors.text }]}>
                    {lesson.teacher}
                  </Text>
                  <Text style={[styles.lessonDate, { color: theme.colors.textSecondary }]}>
                    {formatDate(lesson.date)}
                  </Text>
                </View>
                
                <View style={styles.lessonPieces}>
                  {lesson.pieces && lesson.pieces.map((piece, index) => (
                    <View 
                      key={index}
                      style={[styles.pieceTag, { backgroundColor: theme.colors.primaryLight }]}
                    >
                      <Text style={[styles.pieceText, { color: theme.colors.primary }]}>
                        {piece}
                      </Text>
                    </View>
                  ))}
                </View>
                
                {lesson.summary && (
                  <Text 
                    style={[styles.lessonSummary, { color: theme.colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {lesson.summary}
                  </Text>
                )}
              </View>
            ))}
          </View>
          
          <View style={styles.formContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>タイトル</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              value={title}
              onChangeText={setTitle}
              placeholder="例: フルートのタンギング練習について"
              placeholderTextColor={theme.colors.textTertiary}
              maxLength={50}
            />

            <Text style={[styles.label, { color: theme.colors.text }]}>トピック</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              value={selectedTopic}
              onChangeText={setSelectedTopic}
              placeholder="例: 音色、テクニック、表現力など"
              placeholderTextColor={theme.colors.textTertiary}
              maxLength={30}
            />

            <Text style={[styles.label, { color: theme.colors.text }]}>AIへのメッセージ</Text>
            <TextInput
              style={[styles.messageInput, { 
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              value={initialMessage}
              onChangeText={setInitialMessage}
              placeholder="AIに質問や相談したいことを入力してください"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            
            <Text style={[styles.helperText, { color: theme.colors.textTertiary }]}>
              選択したレッスンの内容は自動的にAIに送信されます。
              具体的な質問や悩みを入力してください。
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: theme.colors.primary },
                isCreating && { opacity: 0.7 },
                (!title.trim() || !selectedTopic || !initialMessage.trim()) && { opacity: 0.5 }
              ]}
              onPress={createConsultationRoom}
              disabled={isCreating || !title.trim() || !selectedTopic || !initialMessage.trim()}
            >
              {isCreating ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.createButtonText}>
                    作成中...
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="chat" size={24} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>
                    チャットルームを作成
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  lessonItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonTeacher: {
    fontSize: 16,
    fontWeight: '600',
  },
  lessonDate: {
    fontSize: 14,
  },
  lessonPieces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  pieceTag: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  pieceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  lessonSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  messageInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    height: 120,
    borderWidth: 1,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 24,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 