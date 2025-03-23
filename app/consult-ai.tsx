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
import { useTheme } from './theme/index';
import { useLessonStore } from './store/lessons';
import { useAuthStore } from './store/auth';
import { Lesson } from './store/lessons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';
import { createChatRoom } from './services/chatRoomService';
import { getUserProfile, instrumentCategories } from './services/userProfileService';

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
  const { lessonIds } = useLocalSearchParams();
  const [selectedLessons, setSelectedLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [userModelType, setUserModelType] = useState<string>('');
  const [topics, setTopics] = useState<string[]>(INSTRUMENT_TOPICS['default']);
  const theme = useTheme();
  const { lessons } = useLessonStore();
  const { user } = useAuthStore();

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
          
          // 楽器に応じたトピックリストをセット
          setTopics(INSTRUMENT_TOPICS[instrument] || INSTRUMENT_TOPICS['default']);
          
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
    const fetchSelectedLessons = async () => {
      if (!lessonIds) {
        Alert.alert('エラー', 'レッスンが選択されていません');
        router.back();
        return;
      }

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
              });
            }
          }
        }
        
        // レッスンデータが取得できたら、タイトルを自動生成
        if (lessonsData.length > 0) {
          const pieces = lessonsData.flatMap(lesson => lesson.pieces || []).filter(Boolean);
          const uniquePieces = [...new Set(pieces)];
          
          if (uniquePieces.length > 0) {
            setTitle(`${uniquePieces[0]}についての相談`);
          } else {
            setTitle(`レッスン相談 (${lessonsData.length}件)`);
          }
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

    if (selectedLessons.length === 0) {
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
      // レッスンデータを整形
      const lessonsData = selectedLessons.map(lesson => ({
        teacher: lesson.teacher,
        date: formatDate(lesson.date),
        pieces: lesson.pieces,
        summary: lesson.summary,
        notes: lesson.notes,
      }));

      // レッスンデータを含めた初期メッセージを作成
      const formattedMessage = `
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

      // チャットルームを作成
      const chatRoom = await createChatRoom(
        title.trim(),
        selectedTopic,
        formattedMessage.trim(),
        userModelType || 'standard'
      );
      
      // 作成したチャットルームに遷移
      router.push({
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
          onPress={() => router.back()}
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
            <ScrollView
              contentContainerStyle={styles.topicsContainer}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {topics.map((topic) => (
                <TouchableOpacity
                  key={topic}
                  style={[
                    styles.topicItem,
                    selectedTopic === topic && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedTopic(topic)}
                >
                  <Text
                    style={[
                      styles.topicText,
                      selectedTopic === topic && { color: 'white' },
                    ]}
                  >
                    {topic}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    paddingVertical: 8,
  },
  topicItem: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  topicText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A4A4A',
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