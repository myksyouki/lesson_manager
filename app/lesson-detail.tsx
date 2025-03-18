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
import { db, auth } from './config/firebase';
import { MaterialIcons } from '@expo/vector-icons';
import LessonDetailHeader from './features/lessons/components/detail/LessonDetailHeader';
import LessonDetailContent from './features/lessons/components/detail/LessonDetailContent';

export default function LessonDetail() {
  const params = useLocalSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [formData, setFormData] = useState({
    id: params.id as string,
    teacher: '',
    date: '',
    pieces: [] as string[],
    summary: '',
    notes: '',
    tags: [] as string[],
    isFavorite: false,
    status: '',
    transcription: '',
    newPiece: '',
  });

  // Firestoreからのリアルタイム更新を監視
  useEffect(() => {
    if (!params.id) return;

    console.log(`レッスン詳細画面: ID ${params.id} のリアルタイム監視を開始します`);

    const lessonRef = doc(db, 'lessons', params.id as string);
    const unsubscribe = onSnapshot(lessonRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const lessonData = docSnapshot.data();
        console.log(`レッスンデータ更新を検出:`, JSON.stringify({
          id: params.id,
          status: lessonData.status,
          summary: lessonData.summary ? '有り' : 'なし',
          transcription: lessonData.transcription ? '有り' : 'なし',
          audioUrl: lessonData.audioUrl || lessonData.audio_url ? '有り' : 'なし'
        }, null, 2));
        
        // 更新されたデータをローカル状態に保存
        const updatedLesson = {
          id: params.id as string,
          teacher: lessonData.teacher || lessonData.teacherName || '',
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
        };
        
        setCurrentLesson(updatedLesson);
        
        // 更新されたデータをフォームデータに反映
        setFormData(prevData => {
          const newData = {
            ...prevData,
            teacher: lessonData.teacher || lessonData.teacherName || '',
            date: lessonData.date || '',
            pieces: lessonData.pieces ? lessonData.pieces : [], // piecesがnullまたはundefinedの場合、空の配列を代入
            summary: lessonData.summary || '',
            notes: lessonData.notes || '',
            tags: lessonData.tags || [],
            isFavorite: lessonData.isFavorite || false,
            status: lessonData.status || '',
            transcription: lessonData.transcription || '',
          };
          
          console.log(`フォームデータを更新:`, JSON.stringify({
            status: newData.status,
            summary: newData.summary ? '有り' : 'なし',
            transcription: newData.transcription ? '有り' : 'なし'
          }, null, 2));
          
          return newData;
        });
      }
    });

    return () => {
      console.log(`レッスン詳細画面: ID ${params.id} のリアルタイム監視を終了します`);
      unsubscribe();
    };
  }, [params.id]);

  const handleSave = async () => {
    try {
      // 単一の曲名がある場合は、pieces配列に追加
      let updatedPieces = [...(formData.pieces || [])];
      
      // 現在のユーザーIDを取得
      const userId = auth.currentUser?.uid || 'dummy-user-id';
      
      // レッスンドキュメントへの参照を取得
      const lessonRef = doc(db, 'lessons', formData.id);
      
      // 更新したレッスンデータをFirestoreに直接保存
      await updateDoc(lessonRef, {
        teacher: formData.teacher,
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
      // レッスンドキュメントへの参照を取得
      const lessonRef = doc(db, 'lessons', formData.id);
      
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
      // レッスンドキュメントへの参照を取得
      const lessonRef = doc(db, 'lessons', formData.id);
      
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
        lessonIds: params.id as string
      }
    });
  };

  // AIに相談画面へ遷移
  const navigateToConsultAI = () => {
    setShowExportModal(false);
    router.push({
      pathname: '/consult-ai' as any,
      params: { 
        lessonIds: params.id as string
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <LessonDetailHeader
          title="レッスン詳細"
          isFavorite={formData.isFavorite}
          isEditing={isEditing}
          onToggleFavorite={handleToggleFavorite}
          onEditSave={handleEditSave}
          onDelete={handleDelete}
        />

        <LessonDetailContent
          formData={formData}
          isEditing={isEditing}
          onUpdateFormData={handleUpdateFormData}
          onSave={handleSave}
          onToggleFavorite={handleToggleFavorite}
        />

        {/* エクスポートボタン */}
        <View style={styles.exportButtonWrapper}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={openExportModal}
            activeOpacity={0.7}
          >
            <MaterialIcons name="import-export" size={24} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>エクスポート</Text>
          </TouchableOpacity>
        </View>

        {/* エクスポートモーダル */}
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
                onPress={navigateToGenerateTasks}
              >
                <MaterialIcons name="assignment" size={24} color="#007AFF" />
                <Text style={styles.modalOptionText}>タスク生成</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={navigateToConsultAI}
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
      </View>
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
});