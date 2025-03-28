import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Text,
  Modal
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { MaterialIcons } from '@expo/vector-icons';
import LessonDetailHeader from '../features/lessons/components/detail/LessonDetailHeader';
import LessonDetailContent from '../features/lessons/components/detail/LessonDetailContent';
import { useLessonStore } from '../store/lessons';

export default function LessonDetail() {
  const params = useLocalSearchParams();
  const lessonId = params.id as string;
  console.log('レッスン詳細画面: パラメータID=', lessonId);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // レッスンストアからアーカイブ関連のメソッドを取得
  const { archiveLesson, unarchiveLesson } = useLessonStore();
  
  const [formData, setFormData] = useState({
    id: lessonId,
    teacherName: '',
    date: '',
    pieces: [] as string[],
    summary: '',
    notes: '',
    tags: [] as string[],
    isFavorite: false,
    status: '',
    transcription: '',
    newPiece: '',
    isArchived: false,
    archivedDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
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
          date: lessonData.date || '',
          pieces: lessonData.pieces ? lessonData.pieces : [], // piecesがnullまたはundefinedの場合、空の配列を代入
          summary: lessonData.summary || '',
          notes: lessonData.notes || '',
          tags: lessonData.tags || [],
          isFavorite: lessonData.isFavorite || false,
          status: lessonData.status || '',
          transcription: lessonData.transcription || '',
          user_id: lessonData.user_id || lessonData.userId || '',
          processingId: lessonData.processingId || '',
          audioUrl: lessonData.audioUrl || lessonData.audio_url || '',
          isArchived: lessonData.isArchived || false,
          archivedDate: lessonData.archivedDate || '',
          priority: lessonData.priority || 'medium',
        };
        
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
            date: lessonData.date || '',
            pieces: lessonData.pieces ? lessonData.pieces : [], // piecesがnullまたはundefinedの場合、空の配列を代入
            summary: lessonData.summary || '',
            notes: lessonData.notes || '',
            tags: lessonData.tags || [],
            isFavorite: lessonData.isFavorite || false,
            status: lessonData.status || '',
            transcription: lessonData.transcription || '',
            isArchived: lessonData.isArchived || false,
            priority: lessonData.priority || 'medium',
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
        summary: formData.summary,
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
      });
      
      console.log(`レッスンを更新しました: ${formData.id}`, {
        summary: formData.summary ? '更新済み' : 'なし',
        tags: formData.tags
      });
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
  const navigateToConsultAI = () => {
    setShowExportModal(false);
    router.push({
      pathname: '/consult-ai' as any,
      params: { 
        lessonIds: lessonId
      }
    });
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

  const handleChat = () => {
    router.push({
      pathname: '/consult-ai' as any,
      params: { 
        lessonIds: lessonId
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LessonDetailHeader
        isEditing={isEditing}
        formData={formData}
        onEditSave={handleEditSave}
        onDelete={handleDelete}
        onArchive={toggleArchive}
        isArchived={formData.isArchived}
      />
      <LessonDetailContent
        isEditing={isEditing}
        formData={formData}
        onUpdateFormData={handleUpdateFormData}
      />

      {/* アクションボタン - アーカイブボタンはヘッダーに移動したため削除 */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#4285F4' }]}
          onPress={openExportModal}
        >
          <MaterialIcons name="share" size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>エクスポート</Text>
        </TouchableOpacity>
      </View>

      {/* アーカイブステータスバナー */}
      {formData.isArchived && (
        <View style={styles.archiveBanner}>
          <MaterialIcons name="archive" size={20} color="#FFFFFF" />
          <Text style={styles.archiveBannerText}>
            このレッスンはアーカイブされています
          </Text>
        </View>
      )}

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>エクスポート</Text>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={navigateToGenerateTasks}
            >
              <MaterialIcons name="assignment" size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>タスク生成</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleChat}
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
    backgroundColor: '#FFFFFF',
  },
  exportButtonWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    zIndex: 10,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  exportButtonText: {
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
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
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
  archiveBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#34A853',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  archiveBannerText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
});