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
        teacher: lesson.teacher,
        date: lesson.date,
        pieces: lesson.pieces,
        summary: lesson.summary,
        notes: lesson.notes,
        tags: lesson.tags,
      }));

      // Difyを使って練習メニューを生成
      // 実際のDify APIリクエストはここに実装
      // 今回はモックデータを使用
      const mockResponse = await mockDifyRequest(lessonsData);
      
      // 生成された練習メニューをタスクとして保存
      const taskId = await addTask({
        title: `${selectedLessons[0].pieces?.[0] || '曲'} の練習メニュー`,
        description: formatTaskDescription(mockResponse, selectedLessons),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1週間後
        isCompleted: false,
        userId: user.uid,
      });
      
      setGeneratedTaskId(taskId);
      setIsGenerating(false);
      
      Alert.alert(
        '成功',
        '練習メニューを生成しました',
        [
          { 
            text: '確認する', 
            onPress: () => {
              router.push({
                pathname: '/task-detail',
                params: { id: taskId }
              });
            }
          },
          { 
            text: '閉じる', 
            onPress: () => router.back(),
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('タスク生成エラー:', error);
      setIsGenerating(false);
      Alert.alert('エラー', '練習メニューの生成に失敗しました');
    }
  };

  // モックDifyリクエスト（実際のAPIが実装されるまでの仮実装）
  const mockDifyRequest = async (lessonsData: any[]) => {
    // 実際のAPIリクエストの代わりに、2秒待機して応答を返す
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          practice_points: [
            "テンポの安定性を向上させる",
            "フレージングの表現力を高める",
            "ダイナミクスの対比をより明確に",
            "左手の伴奏パターンをスムーズに",
            "右手のメロディラインを歌うように",
          ],
          technical_exercises: [
            "スケール練習: ハノン No.1-5を様々なテンポで",
            "アルペジオ練習: 関連する調性で",
            "和音の練習: 曲中の難しい和音進行を抽出して",
          ],
          interpretation_advice: "この曲の感情表現をより豊かにするために、各フレーズの頂点を意識し、自然な流れを作りましょう。特に中間部の転調箇所では、和声の変化を聴き手に伝わるように演奏することが重要です。"
        });
      }, 2000);
    });
  };

  // タスク説明文をフォーマットする関数
  const formatTaskDescription = (response: any, lessons: Lesson[]) => {
    const pieces = lessons.flatMap(lesson => lesson.pieces || []).filter(Boolean);
    const uniquePieces = [...new Set(pieces)];
    
    return `## 練習目標
- ${response.practice_points.join('\n- ')}

## 練習曲
- ${uniquePieces.join('\n- ')}

## テクニカル練習
- ${response.technical_exercises.join('\n- ')}

## 解釈とアドバイス
${response.interpretation_advice}

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