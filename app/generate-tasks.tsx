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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from './theme/index';
import { useLessonStore } from './store/lessons';
import { useTaskStore } from './store/tasks';
import { useAuthStore } from './store/auth';
import { Lesson } from './store/lessons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getUserInstrumentInfo } from './services/userProfileService';

export default function GenerateTasksScreen() {
  const { lessonIds } = useLocalSearchParams();
  const [selectedLessons, setSelectedLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTaskId, setGeneratedTaskId] = useState<string | null>(null);
  const theme = useTheme();
  const { lessons } = useLessonStore();
  const { addTask } = useTaskStore();
  const { user } = useAuthStore();
  const functions = getFunctions();

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
            // ユーザーIDを使って正しいパスでドキュメントを取得
            const userId = user?.uid;
            if (!userId) {
              throw new Error("ユーザーが認証されていません");
            }
            
            const lessonDoc = await getDoc(doc(db, `users/${userId}/lessons`, id));
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
        
        setSelectedLessons(lessonsData);
        setIsLoading(false);
      } catch (error) {
        console.error('レッスンデータ取得エラー:', error);
        Alert.alert('エラー', 'レッスンデータの取得に失敗しました');
        setIsLoading(false);
      }
    };

    fetchSelectedLessons();
  }, [lessonIds, lessons, user]);

  // 練習メニューを生成する関数
  const generateTasks = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    if (selectedLessons.length === 0) {
      Alert.alert('エラー', 'レッスンが選択されていません');
      return;
    }

    setIsGenerating(true);

    try {
      // レッスンデータを整形
      const lessonsData = selectedLessons.map(lesson => ({
        id: lesson.id,
        teacher: lesson.teacher,
        date: lesson.date,
        pieces: lesson.pieces,
        summary: lesson.summary,
        notes: lesson.notes,
        tags: lesson.tags,
      }));

      console.log('Cloud Functionsでタスク生成開始:', lessonsData);
      
      // Firebase Functions経由でタスク生成
      const generateTasksFromLessonsFunction = httpsCallable(functions, 'generateTasksFromLessons');
      
      // ユーザーの楽器情報を取得
      const instrumentInfo = await getUserInstrumentInfo();
      console.log('取得した楽器情報:', instrumentInfo);
      
      // ユーザーの楽器情報を使用
      const instrument = instrumentInfo?.instrumentName || "ピアノ"; // 取得できない場合はデフォルト値を使用
      
      // Cloud Functionsを呼び出し
      // v2関数ではrequestパラメータの形式が変わるためdata値を調整
      const result = await generateTasksFromLessonsFunction({
        lessons: lessonsData,
        instrument: instrument
      });
      
      // v2の場合、result.dataのデータ構造に変更がある可能性があるため、より堅牢に処理
      console.log('タスク生成結果:', result.data);
      
      // 生成されたデータ
      const taskData = result.data as {
        practice_points: string[];
        technical_exercises: string[];
        piece_practice: string[];
        interpretation_advice: string;
      };
      
      // タスクの説明文を作成
      const taskDescription = formatTaskDescription(taskData, selectedLessons);
      
      // タスクのタイトルを作成
      const pieces = selectedLessons.flatMap(lesson => lesson.pieces || []).filter(Boolean);
      const uniquePieces = [...new Set(pieces)];
      const taskTitle = uniquePieces.length > 0 
        ? `${uniquePieces[0]} の練習メニュー`
        : '練習メニュー';
      
      // 生成された練習メニューをタスクとして保存
      const { id: taskId } = await addTask({
        title: taskTitle,
        description: taskDescription,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1週間後
        isCompleted: false,
        userId: user.uid,
        tags: ["練習メニュー"], // タグを追加
        priority: "medium"  // 必須フィールドを追加
      });
      
      setGeneratedTaskId(taskId);
      setIsGenerating(false);
      
      // タスク生成後、タスク詳細ページに自動リダイレクト
      router.push({
        pathname: '/task-detail' as any,
        params: { id: taskId }
      });
    } catch (error) {
      console.error('タスク生成エラー:', error);
      setIsGenerating(false);
      Alert.alert('エラー', '練習メニューの生成に失敗しました');
    }
  };

  // タスク説明文をフォーマットする関数
  const formatTaskDescription = (
    taskData: {
      practice_points: string[];
      technical_exercises: string[];
      piece_practice: string[];
      interpretation_advice: string;
    }, 
    lessons: Lesson[]
  ) => {
    const pieces = lessons.flatMap(lesson => lesson.pieces || []).filter(Boolean);
    const uniquePieces = [...new Set(pieces)];
    
    return `## 練習目標
${taskData.practice_points.map(point => `- ${point}`).join('\n')}

## 練習曲
${uniquePieces.map(piece => `- ${piece}`).join('\n')}

## テクニカル練習
${taskData.technical_exercises.map(exercise => `- ${exercise}`).join('\n')}

## 曲練習のポイント
${taskData.piece_practice.map(point => `- ${point}`).join('\n')}

## 解釈とアドバイス
${taskData.interpretation_advice}

---
*このメニューは ${lessons.length}件のレッスン記録から生成されました*`;
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
      
      // 文字列の場合
      if (typeof dateString === 'string') {
        // 日本語の日付形式の場合はそのまま返す
        if (dateString.includes('年') || dateString.includes('月') || dateString.includes('日')) {
          return dateString;
        }
        
        // その他の形式はDate型に変換して日本語形式にフォーマット
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return dateString; // 無効な日付の場合はそのまま返す
        }
        
        return date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      
      return '日付不明';
    } catch (error) {
      console.error('日付フォーマットエラー:', error);
      return '日付不明';
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
          練習メニュー生成
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
          
          <View style={styles.generateContainer}>
            <TouchableOpacity
              style={[
                styles.generateButton,
                { backgroundColor: theme.colors.primary },
                isGenerating && { opacity: 0.7 }
              ]}
              onPress={generateTasks}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>
                    生成中...
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="auto-awesome" size={24} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>
                    AIで練習メニューを生成
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            <Text style={[styles.generateInfo, { color: theme.colors.textTertiary }]}>
              選択したレッスンの内容から、最適な練習メニューを生成します。
              生成された練習メニューは「タスク」として保存されます。
            </Text>
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
  generateContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    width: '100%',
    marginBottom: 16,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  generateInfo: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
}); 