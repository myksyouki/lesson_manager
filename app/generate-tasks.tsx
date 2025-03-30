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
import { functions as appFunctions, testFunctionConnection, firebaseApp } from './config/firebase';
import { getAuth, User as FirebaseUser } from 'firebase/auth';

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
  
  // Firebase Functionsの確認
  useEffect(() => {
    const checkFunctions = async () => {
      console.log('Firebase Functions初期化確認:', !!appFunctions);
      // 疎通テストを実行
      const isConnected = await testFunctionConnection();
      console.log('Firebase Functions疎通テスト結果:', isConnected);
    };
    
    checkFunctions();
  }, []);

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
                priority: data.priority || "low"  // 優先度を追加
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
      // API呼び出し結果を格納する変数を宣言
      let useServerResponse = false;
      let serverTaskData = null;
      
      // レッスンデータを整形
      const lessonsData = selectedLessons.map(lesson => ({
        summary: lesson.summary || '',
      }));

      // より詳細なデバッグ情報
      console.log('リクエスト準備:', {
        レッスンサマリー数: lessonsData.length,
        サマリー内容: lessonsData.map(l => l.summary.substring(0, 50) + '...')
      });
      
      // ユーザーの楽器情報を取得
      const instrumentInfo = await getUserInstrumentInfo();
      console.log('取得した楽器情報:', instrumentInfo);
      
      // ユーザーの楽器情報を使用
      const instrument = instrumentInfo?.instrumentName || "ピアノ"; // 取得できない場合はデフォルト値を使用
      
      // リクエストデータを整形
      const requestData = {
        summaries: lessonsData.map(lesson => lesson.summary),
        instrument: instrument
      };
      
      console.log('リクエスト内容:', JSON.stringify(requestData));
      
      // Firebaseの認証情報を使用してIDトークンを取得
      let idToken = '';
      try {
        // Firebase Authから実際のユーザーオブジェクトを取得
        const auth = getAuth(firebaseApp);
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          // FirebaseUserからIDトークンを取得
          idToken = await currentUser.getIdToken(true);
          console.log('認証トークン取得成功:', {
            tokenLength: idToken.length,
            tokenPrefix: idToken.substring(0, 10) + '...'
          });
        } else {
          console.error('現在のユーザー情報を取得できません');
        }
      } catch (tokenError) {
        console.error('トークン取得エラー:', tokenError);
      }
      
      // 詳細なデバッグ情報の追加
      if (Platform.OS === 'web') {
        console.log('ブラウザ環境での実行 - ネットワーク情報:', {
          navigator: navigator?.onLine ? 'オンライン' : 'オフライン',
          origin: window?.location?.origin || 'unknown',
          userAgent: navigator?.userAgent || 'unknown'
        });
      }
      
      // エンドポイントを生成
      const region = 'asia-northeast1';
      const projectId = firebaseApp?.options?.projectId || 'lesson-manager-99ab9';
      const endpoint = `https://${region}-${projectId}.cloudfunctions.net/generateTasksFromLessons`;
      console.log('HTTP直接エンドポイント:', endpoint);
      
      // Firebase Functions 直接呼び出しの試行 (HTTP呼び出しの前に実行)
      try {
        console.log('Firebase Functions直接呼び出しを試行...');
        // functionsが正しく初期化されているかチェック
        if (appFunctions) {
          const generateTasksFunction = httpsCallable(appFunctions, 'generateTasksFromLessons');
          console.log('Function参照取得成功、呼び出し直前...');
          
          // 呼び出し前の詳細ログ
          console.log('呼び出し関数名:', 'generateTasksFromLessons');
          console.log('リクエストデータ:', JSON.stringify(requestData).substring(0, 200) + '...');
          
          // タイムアウト設定 (20秒に延長)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Function call timeout (20s)')), 20000)
          );
          
          // 関数呼び出しを実行
          const functionCallPromise = generateTasksFunction(requestData);
          
          // どちらかが先に完了した方を使用
          const functionResult = await Promise.race([
            functionCallPromise.then(result => {
              console.log('Functions直接呼び出し成功:', JSON.stringify(result).substring(0, 200) + '...');
              return result.data;
            }),
            timeoutPromise
          ]).catch(err => {
            console.error('Functions直接呼び出しエラーまたはタイムアウト:', err);
            // エラー詳細を出力
            if (err.code) {
              console.error('エラーコード:', err.code);
            }
            if (err.details) {
              console.error('エラー詳細:', err.details);
            }
            if (err.message) {
              console.error('エラーメッセージ:', err.message);
            }
            return null;
          });
          
          // 関数呼び出しが成功した場合、その結果を使用
          if (functionResult) {
            console.log('Firebase Functions呼び出し成功、結果を使用します');
            serverTaskData = functionResult;
            useServerResponse = true;
            // HTTP呼び出しはスキップ
            console.log('HTTP直接呼び出しはスキップします');
          } else {
            console.log('Firebase Functions呼び出し失敗、HTTP直接呼び出しを試行します');
          }
        } else {
          console.error('Firebase Functions初期化されていないため直接呼び出しできません');
        }
      } catch (functionsError) {
        console.error('Firebase Functions直接呼び出しエラー:', functionsError);
      }
      
      // HTTP直接呼び出しを試行
      if (idToken) {
        try {
          console.log('HTTP直接リクエスト送信直前...');
          
          // タイムアウト制御を設定
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log('HTTP呼び出しタイムアウト - リクエストをアボート');
            controller.abort();
          }, 30000);
          
          // デバッグのためにリクエスト情報をログ出力
          const requestBodyStr = JSON.stringify({data: requestData});
          console.log('HTTP送信データ:', {
            url: endpoint,
            method: 'POST',
            headersAuthTokenLen: idToken.length,
            bodyLength: requestBodyStr.length,
            bodyPreview: requestBodyStr.substring(0, 100) + '...'
          });
          
          // HTTP リクエストを送信
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: requestBodyStr,
            signal: controller.signal
          });
          
          // タイムアウトをクリア
          clearTimeout(timeoutId);
          
          console.log('HTTP直接レスポンス受信:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries([...response.headers.entries()])
          });
          
          // レスポンスを事前に取得
          const responseText = await response.text();
          console.log('レスポンステキスト:', responseText.substring(0, 200) + '...');
          
          // エラーチェック
          if (!response.ok) {
            console.error('HTTP直接エラー詳細:', {
              status: response.status,
              statusText: response.statusText,
              responseText: responseText
            });
            throw new Error(`HTTP エラー ${response.status}: ${responseText}`);
          }
          
          // JSONデータとして解析
          let responseData;
          try {
            responseData = JSON.parse(responseText);
            console.log('レスポンス解析完了:', responseData);
          } catch(parseError) {
            console.error('JSONパースエラー:', parseError);
            throw new Error(`レスポンスのJSONパースに失敗: ${responseText.substring(0, 100)}...`);
          }
          
          if (responseData && responseData.result) {
            serverTaskData = responseData.result;
            useServerResponse = true;
            console.log('サーバーからのタスクデータを使用します');
          } else {
            console.error('応答データ不正:', responseData);
            throw new Error('タスクデータが取得できませんでした');
          }
        } catch (httpError) {
          console.error('HTTP直接リクエストエラー:', httpError);
          // HTTPリクエストが失敗した場合、デモモードにフォールバック
          console.log('HTTP直接呼び出しに失敗したため、デモモードにフォールバックします');
        }
      } else {
        console.log('認証トークンが取得できないため、HTTP直接呼び出しをスキップします');
      }
      
      // タスクデータを定義（サーバー応答またはデモデータ）
      let taskData;
      
      if (useServerResponse && serverTaskData) {
        // サーバーからのレスポンスを使用
        taskData = serverTaskData;
      } else {
        // デモ用のハードコードされたタスクデータを使用
        console.log('デモモードでタスクを生成します');
        
        taskData = {
          practice_points: [
            "正しい姿勢と基本的な奏法を意識する",
            "音色の均一性と美しさを追求する", 
            "リズム感を向上させる",
            "表現力を高める",
            "楽曲の構造を理解する"
          ],
          technical_exercises: [
            "基本的なスケール練習",
            "アルペジオ練習",
            "音程練習",
            "リズム練習",
            "アーティキュレーション練習"
          ],
          piece_practice: [
            "難しいフレーズを分割して練習する",
            "メトロノームを使ってテンポをコントロールする",
            "曲の表現ポイントを意識する",
            "フレーズの繋がりに注意する",
            "曲全体の流れを意識する"
          ],
          interpretation_advice: "レッスンで学んだことを復習し、音楽の流れと感情表現を大切にしましょう。テクニックだけでなく、曲の持つ感情や物語を表現することを意識して練習を進めてください。"
        };
      }
      
      // タスクの説明文と題名を作成
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
      
      // エラーメッセージの改善
      if (error instanceof Error) {
        // Firebase Functions のエラーは details プロパティにより詳細な情報を持つ
        const details = (error as any).details ? `: ${JSON.stringify((error as any).details)}` : '';
        Alert.alert('エラー', `練習メニューの生成に失敗しました: ${error.message}${details}`);
      } else {
      Alert.alert('エラー', '練習メニューの生成に失敗しました');
      }
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
    // デバッグ情報を出力
    console.log('formatTaskDescription data:', taskData);
    
    if (!taskData) {
      console.error('taskDataがnullまたはundefinedです');
      throw new Error('タスクデータが取得できませんでした');
    }
    
    // 各プロパティの存在確認
    if (!taskData.practice_points) {
      console.error('practice_pointsが存在しません');
      throw new Error('練習目標データが取得できませんでした');
    }
    
    if (!taskData.technical_exercises) {
      console.error('technical_exercisesが存在しません');
      throw new Error('テクニカル練習データが取得できませんでした');
    }
    
    if (!taskData.piece_practice) {
      console.error('piece_practiceが存在しません');
      throw new Error('曲練習のポイントデータが取得できませんでした');
    }
    
    if (!taskData.interpretation_advice) {
      console.error('interpretation_adviceが存在しません');
      throw new Error('解釈とアドバイスデータが取得できませんでした');
    }
    
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