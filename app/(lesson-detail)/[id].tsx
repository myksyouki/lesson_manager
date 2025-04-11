import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Text,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth, functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { MaterialIcons } from '@expo/vector-icons';
import LessonDetailHeader from '../features/lessons/components/detail/LessonDetailHeader';
import LessonDetailContent from '../features/lessons/components/detail/LessonDetailContent';
import { useLessonStore } from '../../store/lessons';
import { getCurrentUserProfile } from '../../services/userProfileService';
import { updateTask, createTask, getUserTasks, Task } from '../../services/taskService';
import { Timestamp } from "firebase/firestore";

// PracticeMenuとPracticeStepインターフェース
interface PracticeStep {
  title: string;
  description: string;
  estimatedTime?: number;
  // レガシーフィールド
  id?: string;
  duration?: number;
  orderIndex?: number;
}

interface PracticeMenu {
  title: string;
  description: string;
  steps: PracticeStep[];
  category?: string;
  difficultyLevel?: string;
  tags?: string[];
  // レガシーフィールド
  id?: string;
  instrument?: string;
  difficulty?: string;
  duration?: number;
}

export default function LessonDetail() {
  const params = useLocalSearchParams();
  const lessonId = params.id as string;
  console.log('レッスン詳細画面: パラメータID=', lessonId);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<any>({
    id: lessonId,
    teacherName: '',
    date: '',
    pieces: [],
    notes: '',
    tags: [],
    summary: '',
    status: '',
    isFavorite: false,
    isArchived: false,
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  
  // レッスンストアからアーカイブ関連のメソッドを取得
  const { archiveLesson, unarchiveLesson } = useLessonStore();
  
  const [formData, setFormData] = useState({
    id: lessonId,
    teacherName: '',
    date: '',
    pieces: [] as string[],
    notes: '',
    tags: [] as string[],
    priority: 'medium' as 'high' | 'medium' | 'low',
    summary: '',
    status: '',
    isFavorite: false,
    transcription: '',
    isArchived: false,
    archivedDate: '',
    aiInstructions: '',
  });

  // Firestoreからのリアルタイム更新を監視
  useEffect(() => {
    if (!lessonId) return;

    console.log(`レッスン詳細画面: ID ${lessonId} のリアルタイム監視を開始します`);

    // 現在のユーザーIDを取得
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error('ユーザーが認証されていません');
      return;
    }

    // 正しいパスでレッスンデータにアクセス
    const lessonRef = doc(db, `users/${userId}/lessons`, lessonId);
    console.log(`レッスンパス: users/${userId}/lessons/${lessonId}`);
    
    const unsubscribe = onSnapshot(lessonRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const lessonData = docSnapshot.data();
        console.log(`レッスンデータ更新を検出:`, JSON.stringify({
          id: lessonId,
          status: lessonData.status,
          summary: lessonData.summary ? '有り' : 'なし',
          transcription: lessonData.transcription ? '有り' : 'なし',
          audioUrl: lessonData.audioUrl || lessonData.audio_url ? '有り' : 'なし'
        }, null, 2));
        
        // 更新されたデータをローカル状態に保存
        const updatedLesson = {
          id: lessonId,
          teacherName: lessonData.teacher || lessonData.teacherName || '',
          date: lessonData.date || new Date().toISOString().split('T')[0],
          pieces: lessonData.pieces ? lessonData.pieces : [], // piecesがnullまたはundefinedの場合、空の配列を代入
          notes: lessonData.notes || '',
          tags: lessonData.tags || [],
          priority: lessonData.priority || 'medium',
          summary: lessonData.summary || '',
          status: lessonData.status || '',
          isFavorite: lessonData.isFavorite || false,
          transcription: lessonData.transcription || '',
          user_id: lessonData.user_id || lessonData.userId || '',
          processingId: lessonData.processingId || '',
          audioUrl: lessonData.audioUrl || lessonData.audio_url || '',
          isArchived: lessonData.isArchived || false,
          archivedDate: lessonData.archivedDate || '',
          aiInstructions: lessonData.aiInstructions || '',
        };
        
        // 日付が空または無効な場合、現在の日付を使用
        if (!updatedLesson.date) {
          const today = new Date();
          updatedLesson.date = `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, '0')}月${String(today.getDate()).padStart(2, '0')}日`;
          console.log('日付データがないため現在の日付を使用:', updatedLesson.date);
        }
        
        setCurrentLesson(updatedLesson);
        
        // サマリーとタグのデバッグログ
        console.log(`レッスン詳細: サマリーとタグ`, {
          summaryLength: (lessonData.summary || '').length,
          summaryPreview: (lessonData.summary || '').substring(0, 50) + '...',
          tagsReceived: Array.isArray(lessonData.tags),
          tagsCount: Array.isArray(lessonData.tags) ? lessonData.tags.length : 0,
          tags: lessonData.tags
        });
        
        // 更新されたデータをフォームデータに反映
        setFormData(prevData => {
          const newData = {
            ...prevData,
            teacherName: lessonData.teacher || lessonData.teacherName || '',
            date: lessonData.date || updatedLesson.date, // updatedLessonからデフォルト日付を使用
            pieces: lessonData.pieces ? lessonData.pieces : [], // piecesがnullまたはundefinedの場合、空の配列を代入
            notes: lessonData.notes || '',
            tags: lessonData.tags || [],
            priority: lessonData.priority || 'medium',
            summary: lessonData.summary || '',
            status: lessonData.status || '',
            isFavorite: lessonData.isFavorite || false,
            transcription: lessonData.transcription || '',
            isArchived: lessonData.isArchived || false,
          };
          
          console.log(`フォームデータを更新:`, JSON.stringify({
            status: newData.status,
            summary: newData.summary ? '有り' : 'なし',
            summaryLength: newData.summary.length,
            transcription: newData.transcription ? '有り' : 'なし',
            tags: newData.tags
          }, null, 2));
          
          return newData;
        });
      }
    });

    return () => {
      console.log(`レッスン詳細画面: ID ${lessonId} のリアルタイム監視を終了します`);
      unsubscribe();
    };
  }, [lessonId]);

  const handleSave = async () => {
    try {
      // 単一の曲名がある場合は、pieces配列に追加
      let updatedPieces = [...(formData.pieces || [])];
      
      // 現在のユーザーIDを取得
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('ユーザーが認証されていません');
        Alert.alert('エラー', 'ユーザー認証が必要です');
        return;
      }
      
      // レッスンドキュメントへの正しい参照を取得
      const lessonRef = doc(db, `users/${userId}/lessons`, formData.id);
      console.log(`レッスンの更新: users/${userId}/lessons/${formData.id}`);
      
      // 更新したレッスンデータをFirestoreに直接保存
      await updateDoc(lessonRef, {
        teacherName: formData.teacherName,
        date: formData.date,
        pieces: updatedPieces,
        notes: formData.notes,
        tags: formData.tags,
        user_id: userId,
        isFavorite: formData.isFavorite,
        status: formData.status || 'completed',
        transcription: formData.transcription || '',
        updated_at: serverTimestamp(),
        // 既存のデータを保持
        audioUrl: currentLesson?.audioUrl,
        isDeleted: false,
        processingId: currentLesson?.processingId || '',
        priority: formData.priority,
        summary: formData.summary,
        aiInstructions: formData.aiInstructions,
      });
      
      console.log(`レッスンを更新しました: ${formData.id}`);
      setIsEditing(false);
    } catch (error) {
      console.error('レッスン更新エラー:', error);
      Alert.alert('エラー', 'レッスンの更新に失敗しました');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      // 現在のユーザーIDを取得
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('ユーザーが認証されていません');
        Alert.alert('エラー', 'ユーザー認証が必要です');
        return;
      }
      
      // レッスンドキュメントへの正しい参照を取得
      const lessonRef = doc(db, `users/${userId}/lessons`, formData.id);
      
      // お気に入り状態を反転
      const newFavoriteState = !formData.isFavorite;
      
      // Firestoreのお気に入り状態を更新
      await updateDoc(lessonRef, {
        isFavorite: newFavoriteState,
        updated_at: serverTimestamp()
      });
      
      // ローカルの状態も更新
      setFormData({ ...formData, isFavorite: newFavoriteState });
    } catch (error) {
      console.error('お気に入り更新エラー:', error);
      Alert.alert('エラー', 'お気に入りの更新に失敗しました');
    }
  };

  const handleUpdateFormData = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleEditSave = () => {
    if (isEditing) {
      handleSave();
    } else {
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    // 編集をキャンセルして元の状態に戻す
    setFormData({
      id: currentLesson.id,
      teacherName: currentLesson.teacherName || '',
      date: currentLesson.date || '',
      pieces: currentLesson.pieces || [],
      notes: currentLesson.notes || '',
      tags: currentLesson.tags || [],
      priority: currentLesson.priority || 'medium',
      summary: currentLesson.summary || '',
      status: currentLesson.status || '',
      isFavorite: currentLesson.isFavorite || false,
      transcription: currentLesson.transcription || '',
      isArchived: currentLesson.isArchived || false,
      archivedDate: currentLesson.archivedDate || '',
      aiInstructions: currentLesson.aiInstructions || '',
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      // 現在のユーザーIDを取得
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('ユーザーが認証されていません');
        Alert.alert('エラー', 'ユーザー認証が必要です');
        return;
      }
      
      // レッスンドキュメントへの正しい参照を取得
      const lessonRef = doc(db, `users/${userId}/lessons`, formData.id);
      
      // 論理削除を実行（isDeletedフラグを設定）
      await updateDoc(lessonRef, {
        isDeleted: true,
        updated_at: serverTimestamp()
      });
      
      console.log(`レッスンを削除しました: ${formData.id}`);
      router.back();
    } catch (error) {
      console.error('レッスン削除エラー:', error);
      Alert.alert('エラー', 'レッスンの削除に失敗しました');
    }
  };

  // エクスポートモーダルを表示
  const openExportModal = () => {
    setShowExportModal(true);
  };

  // タスク生成画面へ遷移
  const navigateToGenerateTasks = () => {
    setShowExportModal(false);
    router.push({
      pathname: '/generate-tasks' as any,
      params: { 
        lessonIds: lessonId
      }
    });
  };

  // AIに相談画面へ遷移
  const handleChat = () => {
    setShowExportModal(false); // モーダルを閉じる
    
    if (currentLesson?.summary) {
      router.push({
        pathname: '/consult-ai',
        params: {
          lessonIds: JSON.stringify([lessonId]),
          summaryContext: currentLesson.summary,
          initialPrompt: `このレッスンについて質問があります。${currentLesson.pieces && currentLesson.pieces.length > 0 ? '曲目は ' + currentLesson.pieces.join(', ') + ' です。' : ''}`
        }
      });
    } else {
      Alert.alert('エラー', 'このレッスンはAIチャットに使用できません。サマリーがありません。');
    }
  };
  
  /**
   * AIでタスクを生成する
   */
  const handleGenerateTasks = async () => {
    setShowExportModal(false);
    
    if (!auth.currentUser) {
      alert('タスクを生成するにはログインが必要です');
      return;
    }

    if (!currentLesson || !currentLesson.summary) {
      alert('タスクを生成するにはレッスンのサマリーが必要です');
      return;
    }

    // 確認ダイアログ
    Alert.alert(
      'タスク生成',
      'AIを使用してレッスン内容から練習メニューを生成しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '生成',
          onPress: async () => {
            setIsLoadingTasks(true);
            try {
              const generatePracticeRecommendation = httpsCallable(functions, 'generatePracticeRecommendation');

              // ユーザー情報を取得
              const userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''));
              const userData = userDoc.data();
              
              // 楽器情報（デフォルトはピアノ）
              const instrument = userData?.instrument || 'Piano';
              
              console.log(`${instrument}の練習メニューを生成します...`);
              
              // GenKit APIを呼び出す
              const result = await generatePracticeRecommendation({
                lessonSummary: currentLesson.summary,
                instrument: instrument,
                level: 'INTERMEDIATE'
              });
              
              // レスポンスデータの取得
              const responseData = result.data as { 
                success: boolean; 
                recommendations?: PracticeMenu[];
                message?: string 
              };
              
              console.log('レスポンスデータ:', responseData);
              
              if (!responseData.success) {
                throw new Error(responseData.message || '練習メニュー生成に失敗しました');
              }
              
              // レコメンデーションの配列を取得（nullの場合は空配列）
              const recommendations = responseData.recommendations || [];
              console.log('取得した練習メニュー:', recommendations);
              
              if (recommendations.length === 0) {
                alert('練習メニューが見つかりませんでした。別のレッスン内容で試してください。');
                setIsLoadingTasks(false);
                return;
              }
              
              // 各レコメンデーションをタスクとして保存
              const userId = auth.currentUser?.uid;
              if (!userId) {
                throw new Error('ユーザーIDが取得できませんでした');
              }
              
              const tasksCreated = await Promise.all(
                recommendations.map(async (menu) => {
                  // ステップをマークダウン形式に変換
                  const stepsText = menu.steps.map(step => 
                    `- ${step.title}: ${step.description} (${step.estimatedTime || step.duration || 0}分)`
                  ).join('\n');
                  
                  // 完全な説明文を作成
                  const fullDescription = `${menu.description}\n\n【練習ステップ】\n${stepsText}\n\n【目安時間】${menu.duration || 30}分\n【難易度】${menu.difficultyLevel || menu.difficulty || "中級"}\n【カテゴリ】${menu.category || "基本練習"}`;
                  
                  // taskServiceのcreateTaskを使用してタスクを作成
                  const task = await createTask(
                    userId,
                    menu.title,
                    fullDescription,
                    undefined, // dueDate
                    [{ // attachments
                      type: 'text',
                      url: `/lessons/${currentLesson.id}`
                    }]
                  );
                  
                  // タスクにタグを追加
                  await updateTask(task.id, {
                    tags: ['練習メニュー', '自動生成', menu.category || '基本練習'],
                    lessonId: currentLesson.id
                  } as any, userId);
                  
                  return task;
                })
              );
              
              console.log(`${tasksCreated.length}個のタスクを作成しました`);
              alert(`${tasksCreated.length}個の練習メニューがタスクリストに追加されました！`);
              
            } catch (error: any) {
              console.error('タスク生成中にエラーが発生しました:', error);
              alert(`エラーが発生しました: ${error?.message || 'タスク生成に失敗しました'}`);
            } finally {
              setIsLoadingTasks(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  // ローカルで練習メニューを作成する関数
  const createLocalPracticeMenu = async (instrument: string) => {
    try {
      console.log("ローカル練習メニュー生成開始");
      if (!auth.currentUser?.uid) {
        console.error('ユーザーが認証されていません');
        throw new Error('認証が必要です。ログインしてください。');
      }

      const now = new Date();
      const sampleMenu: PracticeMenu = {
        id: `local_${now.getTime()}`,
        title: `${instrument}の基本練習`,
        description: 'レッスンで学んだ内容を定着させるための基本練習メニューです。',
        instrument: instrument,
        category: '基礎練習',
        difficulty: 'INTERMEDIATE',
        duration: 30,
        steps: [
          {
            id: 'step1',
            title: 'ウォームアップ',
            description: '基本的なポジションの確認と簡単なウォームアップ練習',
            duration: 5,
            orderIndex: 0
          },
          {
            id: 'step2',
            title: '基本テクニック',
            description: 'レッスンで学んだ基本テクニックの復習',
            duration: 15,
            orderIndex: 1
          },
          {
            id: 'step3',
            title: '応用練習',
            description: '基本テクニックを組み合わせた応用練習',
            duration: 10,
            orderIndex: 2
          }
        ],
        tags: ['基礎', 'ウォームアップ', 'テクニック']
      };

      const stepsText = sampleMenu.steps.map(step => 
        `- ${step.title}: ${step.description} (${step.duration || step.estimatedTime || 0}分)`
      ).join('\n');
      
      const fullDescription = `${sampleMenu.description}\n\n【練習ステップ】\n${stepsText}\n\n【目安時間】${sampleMenu.duration || 30}分\n【難易度】${sampleMenu.difficultyLevel || sampleMenu.difficulty || "中級"}\n【カテゴリ】${sampleMenu.category || "基本練習"}`;
      
      // タスクを作成
      try {
        await createTask(
          auth.currentUser.uid,
          sampleMenu.title,
          fullDescription,
          undefined,
          [{
            type: 'text',
            url: `/lessons/${lessonId}`
          }]
        );
        
        Alert.alert('完了', 'ローカルで練習メニューを作成しました。タスク一覧を表示しますか？', [
          {
            text: 'いいえ',
            style: 'cancel'
          },
          {
            text: 'はい',
            onPress: () => router.push('/tasks')
          }
        ]);
      } catch (error) {
        console.error('タスク作成エラー:', error);
        Alert.alert('エラー', 'タスク作成に失敗しました');
      }
    } catch (error) {
      console.error('ローカル練習メニュー生成エラー:', error);
      Alert.alert('エラー', '練習メニューの生成に失敗しました');
    }
  };

  const toggleArchive = async () => {
    try {
      // 現在のユーザーIDを取得
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('ユーザーが認証されていません');
        Alert.alert('エラー', 'ユーザー認証が必要です');
        return;
      }
      
      // レッスンドキュメントへの正しい参照を取得
      const lessonRef = doc(db, `users/${userId}/lessons`, formData.id);
      
      // アーカイブ状態を反転
      const newArchivedState = !formData.isArchived;
      
      // Firestoreのアーカイブ状態を更新
      await updateDoc(lessonRef, {
        isArchived: newArchivedState,
        updated_at: serverTimestamp()
      });
      
      // ローカルの状態も更新
      setFormData({ ...formData, isArchived: newArchivedState });
    } catch (error) {
      console.error('アーカイブ更新エラー:', error);
      Alert.alert('エラー', 'アーカイブの更新に失敗しました');
    }
  };

  const handleShare = () => {
    // Implement share functionality
    router.push({
      pathname: '/generate-tasks' as any,
      params: { 
        lessonIds: lessonId
      }
    });
  };

  // リフレッシュ処理を追加
  const handleRefresh = () => {
    setRefreshing(true);
    // データを再読み込みする処理
    setTimeout(() => {
      // ここでレッスンデータを再読み込みする処理を呼び出す（例：loadChatRoom()など）
      setRefreshing(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LessonDetailHeader 
        id={lessonId}
        date={formData.date}
        teacher={formData.teacherName}
        isEditing={isEditing}
        isArchived={formData.isArchived || false}
        isFavorite={formData.isFavorite || false}
        onEdit={handleEditSave}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onToggleFavorite={handleToggleFavorite}
      />
      
      <View style={styles.content}>
        <LessonDetailContent 
          formData={formData}
          isEditing={isEditing}
          onUpdateFormData={handleUpdateFormData}
          afterSummary={
            <>
              {formData.status === 'processing' ? (
                <View style={styles.processingIndicator}>
                  <View style={styles.processingIconContainer}>
                    <MaterialIcons name="refresh" size={20} color="#4285F4" />
                  </View>
                  <Text style={styles.processingText}>AIが処理中...</Text>
                  <TouchableOpacity onPress={handleRefresh}>
                    <MaterialIcons name="refresh" size={24} color="#4285F4" />
                  </TouchableOpacity>
                </View>
              ) : null}
              
              <TouchableOpacity
                style={[styles.inlineActionButton, { backgroundColor: '#4285F4' }]}
                onPress={openExportModal}
              >
                <MaterialIcons name="share" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>エクスポート</Text>
              </TouchableOpacity>
            </>
          }
        />
      </View>
      
      {/* エクスポート選択モーダル */}
      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>エクスポート</Text>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => handleGenerateTasks()}
            >
              <MaterialIcons name="assignment" size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>タスク生成</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => handleChat()}
            >
              <MaterialIcons name="smart-toy" size={24} color="#5856D6" />
              <Text style={styles.modalOptionText}>AIに相談</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1, // コンテンツが画面いっぱいに広がるように設定
  },
  inlineActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: -4,
    marginBottom: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 16,
  },
  cancelOption: {
    justifyContent: 'center',
    borderBottomWidth: 0,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  archiveBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#34A853',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  archiveBannerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 10,
  },
  popoverMenu: {
    position: 'relative',
    width: '60%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#EBF3FB',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  processingIconContainer: {
    marginRight: 8,
  },
  processingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 12,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  exportOptionText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#333',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
});